import type { Clock } from '@event-driven-platform/clock';
import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ReaderObservation, ReaderObservationContext } from '@event-driven-platform/observability';
import type { AnyRead } from '@event-driven-platform/read';
import { describe, expect, it } from 'vitest';

import { executeReadWithRetry, type ExecuteReadWithRetryDependencies } from './execute-read-with-retry.js';
import type { RetryDelay } from './retry-delay.js';

class RecordingRetryDelay implements RetryDelay {
    readonly delays: number[] = [];

    async wait(delayMs: number): Promise<void> {
        this.delays.push(delayMs);
    }
}

class RecordingObserver {
    readonly events: ReaderObservation[] = [];

    observe(observation: ReaderObservation): undefined {
        this.events.push(observation);
        return undefined;
    }
}

const fixedClock: Clock = { now: () => '2026-08-20T10:00:00.000Z' };
const context: ReaderObservationContext = {
    read: 'wallet.get',
    tenant: { type: 'merchant', id: 'merchant-1' as AnyRead['tenant']['id'] },
};

function dependencies(
    overrides: Partial<ExecuteReadWithRetryDependencies> = {},
): ExecuteReadWithRetryDependencies & { readonly retryDelay: RecordingRetryDelay; readonly observer: RecordingObserver } {
    return {
        retryDelay: new RecordingRetryDelay(),
        observer: new RecordingObserver(),
        clock: fixedClock,
        ...overrides,
    } as ExecuteReadWithRetryDependencies & {
        readonly retryDelay: RecordingRetryDelay;
        readonly observer: RecordingObserver;
    };
}

function retryableError(code = 'source-unavailable') {
    return new ExecutionFailureError({
        code,
        message: 'Source unavailable.',
        retryable: true,
    });
}

function nonRetryableError() {
    return new ExecutionFailureError({
        code: 'invalid-source-response',
        message: 'Source response is invalid.',
        retryable: false,
    });
}

function sequencedWork<TResult>(outcomes: readonly (() => Promise<TResult>)[]) {
    let call = 0;
    return async (): Promise<TResult> => {
        const outcome = outcomes[call];
        call += 1;

        if (outcome === undefined) {
            throw new Error('No outcome configured for this call.');
        }

        return outcome();
    };
}

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
    try {
        await work();
        return null;
    } catch (error: unknown) {
        return error;
    }
}

describe('executeReadWithRetry', () => {
    it('succeeds after a retryable failure', async () => {
        const deps = dependencies();
        const firstError = retryableError();
        const work = sequencedWork([
            () => Promise.reject(firstError),
            () => Promise.resolve('result'),
        ]);

        const result = await executeReadWithRetry(work, { maxAttempts: 2 }, context, deps);

        expect(result).toBe('result');
        expect(deps.observer.events.map((event) => event.type)).toEqual([
            'read.attempt.started',
            'read.attempt.completed',
            'read.retry.scheduled',
            'read.attempt.started',
            'read.attempt.completed',
        ]);
    });

    it('stops when the maxAttempts budget is exhausted', async () => {
        const deps = dependencies();
        const firstError = retryableError('first');
        const secondError = retryableError('second');
        const work = sequencedWork([
            () => Promise.reject(firstError),
            () => Promise.reject(secondError),
        ]);

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 2 }, context, deps));

        expect(error).toBe(secondError);
    });

    it('does not retry a non-retryable failure', async () => {
        const deps = dependencies();
        const errorValue = nonRetryableError();
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 3 }, context, deps));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
        expect(deps.observer.events.some((event) => event.type === 'read.retry.scheduled')).toBe(false);
    });

    it('does not retry when no retry option is configured', async () => {
        const deps = dependencies();
        const errorValue = retryableError();
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, undefined, context, deps));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
        expect(deps.observer.events.some((event) => event.type === 'read.retry.scheduled')).toBe(false);
    });

    it('uses the configured fixed delay before the next attempt', async () => {
        const deps = dependencies();
        const work = sequencedWork([
            () => Promise.reject(retryableError()),
            () => Promise.resolve('result'),
        ]);

        await executeReadWithRetry(
            work,
            { maxAttempts: 2, strategy: { type: 'fixed', delayMs: 125 } },
            context,
            deps,
        );

        expect(deps.retryDelay.delays).toEqual([125]);
        expect(deps.observer.events).toContainEqual({
            type: 'read.retry.scheduled',
            context,
            attempt: 1,
            delayMs: 125,
        });
    });

    it('computes exponential delays per retry attempt across multiple retries', async () => {
        const deps = dependencies();
        const work = sequencedWork([
            () => Promise.reject(retryableError('first')),
            () => Promise.reject(retryableError('second')),
            () => Promise.resolve('result'),
        ]);

        await executeReadWithRetry(
            work,
            { maxAttempts: 3, strategy: { type: 'exponential', initialDelayMs: 100, multiplier: 2 } },
            context,
            deps,
        );

        expect(deps.retryDelay.delays).toEqual([100, 200]);
    });

    it('rethrows immediately when the work throws a plain, unclassified error', async () => {
        const deps = dependencies();
        const errorValue = new Error('boom');
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 3 }, context, deps));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
    });

    it('marks a completed attempt as non-retryable on success', async () => {
        const deps = dependencies();
        const work = async () => 'result';

        await executeReadWithRetry(work, { maxAttempts: 3 }, context, deps);

        expect(deps.observer.events).toContainEqual({
            type: 'read.attempt.completed',
            context,
            attempt: 1,
            outcome: 'success',
            retryable: false,
            durationMs: 0,
        });
    });
});

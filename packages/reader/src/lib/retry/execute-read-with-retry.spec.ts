import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { executeReadWithRetry } from './execute-read-with-retry.js';
import type { RetryDelay } from './retry-delay.js';

class RecordingRetryDelay implements RetryDelay {
    readonly delays: number[] = [];

    async wait(delayMs: number): Promise<void> {
        this.delays.push(delayMs);
    }
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
        const retryDelay = new RecordingRetryDelay();
        const firstError = retryableError();
        const work = sequencedWork([
            () => Promise.reject(firstError),
            () => Promise.resolve('result'),
        ]);

        const result = await executeReadWithRetry(work, { maxAttempts: 2 }, retryDelay);

        expect(result).toBe('result');
    });

    it('stops when the maxAttempts budget is exhausted', async () => {
        const retryDelay = new RecordingRetryDelay();
        const firstError = retryableError('first');
        const secondError = retryableError('second');
        const work = sequencedWork([
            () => Promise.reject(firstError),
            () => Promise.reject(secondError),
        ]);

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 2 }, retryDelay));

        expect(error).toBe(secondError);
    });

    it('does not retry a non-retryable failure', async () => {
        const retryDelay = new RecordingRetryDelay();
        const errorValue = nonRetryableError();
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 3 }, retryDelay));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
    });

    it('does not retry when no retry option is configured', async () => {
        const retryDelay = new RecordingRetryDelay();
        const errorValue = retryableError();
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, undefined, retryDelay));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
    });

    it('uses the configured fixed delay before the next attempt', async () => {
        const retryDelay = new RecordingRetryDelay();
        const work = sequencedWork([
            () => Promise.reject(retryableError()),
            () => Promise.resolve('result'),
        ]);

        await executeReadWithRetry(
            work,
            { maxAttempts: 2, strategy: { type: 'fixed', delayMs: 125 } },
            retryDelay,
        );

        expect(retryDelay.delays).toEqual([125]);
    });

    it('computes exponential delays per retry attempt across multiple retries', async () => {
        const retryDelay = new RecordingRetryDelay();
        const work = sequencedWork([
            () => Promise.reject(retryableError('first')),
            () => Promise.reject(retryableError('second')),
            () => Promise.resolve('result'),
        ]);

        await executeReadWithRetry(
            work,
            { maxAttempts: 3, strategy: { type: 'exponential', initialDelayMs: 100, multiplier: 2 } },
            retryDelay,
        );

        expect(retryDelay.delays).toEqual([100, 200]);
    });

    it('rethrows immediately when the work throws a plain, unclassified error', async () => {
        const retryDelay = new RecordingRetryDelay();
        const errorValue = new Error('boom');
        let calls = 0;
        const work = async () => {
            calls += 1;
            throw errorValue;
        };

        const error = await captureError(() => executeReadWithRetry(work, { maxAttempts: 3 }, retryDelay));

        expect(error).toBe(errorValue);
        expect(calls).toBe(1);
    });
});

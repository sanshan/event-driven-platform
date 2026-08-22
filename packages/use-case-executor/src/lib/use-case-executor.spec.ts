import type { Clock } from '@event-driven-platform/clock';
import type {
    ExecutionId,
    ExecutionIdFactory,
    ExecutionLease,
    ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it, vi } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionOwnershipLostError,
    UseCaseExecutionTransitionError,
    UseCaseExecutorConfigurationError,
    UseCaseIntentConflictError,
} from './use-case-executor-error.js';
import type { UseCaseExecutorRuntime } from './use-case-executor-runtime.js';
import type { UseCaseExecutorTimer, UseCaseExecutorTimerHandle } from './use-case-executor-timer.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const intent = { id: 'intent-1' } as Intent;
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-22T05:00:00.000Z',
    expiresAt: '2026-08-22T05:01:00.000Z',
} as ExecutionLease;
const renewedLease = {
    ownerId: leaseOwnerId,
    version: 2,
    acquiredAt: '2026-08-22T05:00:30.000Z',
    expiresAt: '2026-08-22T05:01:30.000Z',
} as ExecutionLease;

function createExecutor(
    store: UseCaseExecutionStore,
    timer = new TestTimer(),
    runtime: Partial<UseCaseExecutorRuntime> = {},
) {
    const clock: Clock = { now: () => '2026-08-22T05:00:00.000Z' };
    const executionIdFactory: ExecutionIdFactory = { create: () => executionId };

    return {
        executor: new DefaultUseCaseExecutor(
            { clock, executionIdFactory, store, timer },
            { leaseOwnerId, leaseDurationMs: 60_000, ...runtime },
        ),
        timer,
    };
}

function createStore(
    claimResult: Awaited<ReturnType<UseCaseExecutionStore['claim']>>,
): UseCaseExecutionStore {
    return {
        claim: vi.fn(async () => claimResult) as UseCaseExecutionStore['claim'],
        renewLease: vi.fn(async () => ({ type: 'renewed', lease: renewedLease })) as UseCaseExecutionStore['renewLease'],
        complete: vi.fn(async () => ({
            type: 'completed',
            completedAt: '2026-08-22T05:00:00.000Z',
        })) as UseCaseExecutionStore['complete'],
        release: vi.fn(async () => ({
            type: 'released',
            releasedAt: '2026-08-22T05:00:00.000Z',
        })) as UseCaseExecutionStore['release'],
    };
}

describe('DefaultUseCaseExecutor', () => {
    it('rejects invalid lease timing configuration during construction', () => {
        const store = createStore({ type: 'claimed', lease });

        expect(() => createExecutor(store, new TestTimer(), { leaseDurationMs: 0 })).toThrow(
            UseCaseExecutorConfigurationError,
        );
        expect(() =>
            createExecutor(store, new TestTimer(), {
                leaseDurationMs: 60_000,
                renewalIntervalMs: 60_000,
            }),
        ).toThrow(UseCaseExecutorConfigurationError);
    });

    it('replays a completed result without executing or starting renewal', async () => {
        const store = createStore({
            type: 'completed',
            result: 'stored-result',
            completedAt: '2026-08-22T05:00:00.000Z',
        });
        const { executor, timer } = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).resolves.toBe('stored-result');
        expect(useCase.execute).not.toHaveBeenCalled();
        expect(timer.pendingCount).toBe(0);
    });

    it('rejects an active duplicate without executing or starting renewal', async () => {
        const store = createStore({ type: 'already-in-progress', lease });
        const { executor, timer } = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBeInstanceOf(UseCaseAlreadyInProgressError);
        expect(useCase.execute).not.toHaveBeenCalled();
        expect(timer.pendingCount).toBe(0);
    });

    it('rejects an Intent conflict without executing the UseCase', async () => {
        const store = createStore({ type: 'intent-conflict', existingIntentId: 'other-intent' });
        const { executor } = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBeInstanceOf(UseCaseIntentConflictError);
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('executes a claimed UseCase, propagates correlationId, and completes before returning', async () => {
        const store = createStore({ type: 'claimed', lease });
        const { executor } = createExecutor(store);
        const useCase: UseCase<string, string> = {
            execute: vi.fn(async () => 'result'),
        };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-42' }),
        ).resolves.toBe('result');

        expect(useCase.execute).toHaveBeenCalledWith('input', { intent, correlationId: 'c-42' });
        expect(store.complete).toHaveBeenCalledWith(
            expect.objectContaining({ executionId, lease, result: 'result' }),
        );
    });

    it('renews while work is active and completes with the latest lease', async () => {
        const store = createStore({ type: 'claimed', lease });
        const timer = new TestTimer();
        const work = deferred<string>();
        const { executor } = createExecutor(store, timer, { renewalIntervalMs: 20_000 });
        const useCase: UseCase<string, string> = { execute: () => work.promise };

        const execution = executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' });
        expect(timer.delays).toEqual([20_000]);

        timer.fireNext();
        await Promise.resolve();

        expect(store.renewLease).toHaveBeenCalledWith(
            expect.objectContaining({ executionId, lease, leaseDurationMs: 60_000 }),
        );

        work.resolve('result');
        await expect(execution).resolves.toBe('result');
        expect(store.complete).toHaveBeenCalledWith(
            expect.objectContaining({ executionId, lease: renewedLease, result: 'result' }),
        );
        expect(timer.pendingCount).toBe(0);
    });

    it('waits for an in-flight renewal before completing', async () => {
        const store = createStore({ type: 'claimed', lease });
        const renewal = deferred<Awaited<ReturnType<UseCaseExecutionStore['renewLease']>>>();
        store.renewLease = vi.fn(() => renewal.promise) as UseCaseExecutionStore['renewLease'];
        const timer = new TestTimer();
        const work = deferred<string>();
        const { executor } = createExecutor(store, timer);
        const execution = executor.execute({
            useCase: { execute: () => work.promise },
            input: 'input',
            intent,
            correlationId: 'c-1',
        });

        timer.fireNext();
        work.resolve('result');
        await Promise.resolve();
        expect(store.complete).not.toHaveBeenCalled();

        renewal.resolve({ type: 'renewed', lease: renewedLease });
        await expect(execution).resolves.toBe('result');
        expect(store.complete).toHaveBeenCalledWith(
            expect.objectContaining({ lease: renewedLease }),
        );
    });

    it('does not complete or return success after renewal rejects ownership', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.renewLease = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['renewLease'];
        const timer = new TestTimer();
        const work = deferred<string>();
        const { executor } = createExecutor(store, timer);
        const execution = executor.execute({
            useCase: { execute: () => work.promise },
            input: 'input',
            intent,
            correlationId: 'c-1',
        });

        timer.fireNext();
        await Promise.resolve();
        work.resolve('result');

        await expect(execution).rejects.toBeInstanceOf(UseCaseExecutionOwnershipLostError);
        expect(store.complete).not.toHaveBeenCalled();
        expect(store.release).not.toHaveBeenCalled();
    });

    it('treats renewal infrastructure failure as ownership loss', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.renewLease = vi.fn(async () => {
            throw new Error('store unavailable');
        }) as UseCaseExecutionStore['renewLease'];
        const timer = new TestTimer();
        const work = deferred<string>();
        const { executor } = createExecutor(store, timer);
        const execution = executor.execute({
            useCase: { execute: () => work.promise },
            input: 'input',
            intent,
            correlationId: 'c-1',
        });

        timer.fireNext();
        await Promise.resolve();
        work.resolve('result');

        await expect(execution).rejects.toBeInstanceOf(UseCaseExecutionOwnershipLostError);
        expect(store.complete).not.toHaveBeenCalled();
    });

    it('preserves the original UseCase failure after ownership is lost', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.renewLease = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['renewLease'];
        const timer = new TestTimer();
        const work = deferred<string>();
        const originalError = new Error('use-case failed');
        const { executor } = createExecutor(store, timer);
        const execution = executor.execute({
            useCase: { execute: () => work.promise },
            input: 'input',
            intent,
            correlationId: 'c-1',
        });

        timer.fireNext();
        await Promise.resolve();
        work.reject(originalError);

        await expect(execution).rejects.toBe(originalError);
        expect(store.release).not.toHaveBeenCalled();
    });

    it('does not return an unpersisted result when completion is rejected', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.complete = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['complete'];
        const { executor } = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn(async () => 'result') };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBeInstanceOf(UseCaseExecutionTransitionError);
    });

    it('attempts release on UseCase failure and preserves the original error', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.release = vi.fn(async () => {
            throw new Error('release failed');
        }) as UseCaseExecutionStore['release'];
        const originalError = new Error('use-case failed');
        const { executor } = createExecutor(store);
        const useCase: UseCase<string, string> = {
            execute: vi.fn(async () => {
                throw originalError;
            }),
        };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBe(originalError);
        expect(store.release).toHaveBeenCalledWith(
            expect.objectContaining({ executionId, lease }),
        );
    });
});

class TestTimer implements UseCaseExecutorTimer {
    private readonly scheduled: Array<{ active: boolean; callback: () => void; delayMs: number }> = [];

    public schedule(delayMs: number, callback: () => void): UseCaseExecutorTimerHandle {
        const item = { active: true, callback, delayMs };
        this.scheduled.push(item);

        return {
            cancel: () => {
                item.active = false;
            },
        };
    }

    public get delays(): number[] {
        return this.scheduled.map(({ delayMs }) => delayMs);
    }

    public get pendingCount(): number {
        return this.scheduled.filter(({ active }) => active).length;
    }

    public fireNext(): void {
        const item = this.scheduled.find(({ active }) => active);

        if (!item) {
            throw new Error('No scheduled timer is available.');
        }

        item.active = false;
        item.callback();
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

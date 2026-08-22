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

import { UseCaseAlreadyInProgressError } from '../errors/use-case-already-in-progress.error.js';
import { UseCaseExecutionTransitionError } from '../errors/use-case-execution-transition.error.js';
import { UseCaseIntentConflictError } from '../errors/use-case-intent-conflict.error.js';
import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const intent = { id: 'intent-1' } as Intent;
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-22T05:00:00.000Z',
    expiresAt: '2026-08-22T05:00:30.000Z',
} as ExecutionLease;
const clock: Clock = { now: () => '2026-08-22T05:00:00.000Z' };
const executionIdFactory: ExecutionIdFactory = { create: () => executionId };

function createExecutor(store: UseCaseExecutionStore) {
    return new DefaultUseCaseExecutor({ clock, executionIdFactory, store }, { leaseOwnerId });
}

function createStore(
    claimResult: Awaited<ReturnType<UseCaseExecutionStore['claim']>>,
): UseCaseExecutionStore {
    return {
        claim: vi.fn(async () => claimResult) as UseCaseExecutionStore['claim'],
        complete: vi.fn(async () => ({ type: 'completed', completedAt: clock.now() })) as UseCaseExecutionStore['complete'],
        release: vi.fn(async () => ({ type: 'released', releasedAt: clock.now() })) as UseCaseExecutionStore['release'],
    };
}

describe('DefaultUseCaseExecutor', () => {
    it('claims a new invocation with its Intent, correlation and fixed lease', async () => {
        const store = createStore({ type: 'claimed', lease });
        await createExecutor(store).execute({
            useCase: { execute: async () => 'result' },
            input: undefined,
            intent,
            correlationId: 'c-1',
        });

        expect(store.claim).toHaveBeenCalledWith({
            executionId,
            intent,
            correlationId: 'c-1',
            leaseOwnerId,
            leaseDurationMs: 30_000,
            requestedAt: clock.now(),
        });
    });

    it('replays a completed result without executing the UseCase', async () => {
        const store = createStore({ type: 'completed', result: 'stored-result', completedAt: clock.now() });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(createExecutor(store).execute({ useCase, input: 'input', intent, correlationId: 'c-1' })).resolves.toBe('stored-result');
        expect(useCase.execute).not.toHaveBeenCalled();
        expect(store.complete).not.toHaveBeenCalled();
    });

    it('rejects an active duplicate without executing the UseCase', async () => {
        const store = createStore({ type: 'already-in-progress', lease });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(createExecutor(store).execute({ useCase, input: 'input', intent, correlationId: 'c-1' })).rejects.toBeInstanceOf(UseCaseAlreadyInProgressError);
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('rejects an Intent conflict without executing the UseCase', async () => {
        const store = createStore({ type: 'intent-conflict', existingIntentId: 'other-intent' });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(createExecutor(store).execute({ useCase, input: 'input', intent, correlationId: 'c-1' })).rejects.toBeInstanceOf(UseCaseIntentConflictError);
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('passes input and context unchanged and completes with the claimed lease', async () => {
        const store = createStore({ type: 'claimed', lease });
        const useCase: UseCase<string, string> = { execute: vi.fn(async () => 'result') };

        await expect(createExecutor(store).execute({ useCase, input: 'input', intent, correlationId: 'c-42' })).resolves.toBe('result');
        expect(useCase.execute).toHaveBeenCalledWith('input', { intent, correlationId: 'c-42' });
        expect(store.complete).toHaveBeenCalledWith({ executionId, lease, result: 'result', completedAt: clock.now() });
    });

    it('does not return success when fenced completion is rejected', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.complete = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['complete'];

        await expect(createExecutor(store).execute({ useCase: { execute: async () => 'result' }, input: undefined, intent, correlationId: 'c-1' })).rejects.toBeInstanceOf(UseCaseExecutionTransitionError);
    });

    it('attempts fenced release on UseCase failure and preserves the original error', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.release = vi.fn(async () => { throw new Error('release failed'); }) as UseCaseExecutionStore['release'];
        const originalError = new Error('use-case failed');

        await expect(createExecutor(store).execute({
            useCase: { execute: async () => { throw originalError; } },
            input: undefined,
            intent,
            correlationId: 'c-1',
        })).rejects.toBe(originalError);
        expect(store.release).toHaveBeenCalledWith({ executionId, lease, releasedAt: clock.now() });
    });
});

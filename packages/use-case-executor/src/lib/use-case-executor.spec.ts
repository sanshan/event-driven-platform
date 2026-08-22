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
    UseCaseExecutionTransitionError,
    UseCaseIntentConflictError,
} from './use-case-executor-error.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const intent = { id: 'intent-1' } as Intent;
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-22T05:00:00.000Z',
    expiresAt: '2026-08-22T05:00:30.000Z',
} as ExecutionLease;

function createExecutor(store: UseCaseExecutionStore) {
    const clock: Clock = { now: () => '2026-08-22T05:00:00.000Z' };
    const executionIdFactory: ExecutionIdFactory = { create: () => executionId };

    return new DefaultUseCaseExecutor(
        { clock, executionIdFactory, store },
        { leaseOwnerId },
    );
}

function createStore(
    claimResult: Awaited<ReturnType<UseCaseExecutionStore['claim']>>,
): UseCaseExecutionStore {
    return {
        claim: vi.fn(async () => claimResult) as UseCaseExecutionStore['claim'],
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
    it('claims every invocation with the fixed 30 second lease window', async () => {
        const store = createStore({ type: 'completed', result: 'stored', completedAt: '2026-08-22T05:00:00.000Z' });
        const executor = createExecutor(store);

        await executor.execute({
            useCase: { execute: async () => 'unused' },
            input: undefined,
            intent,
            correlationId: 'c-1',
        });

        expect(store.claim).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId,
                leaseOwnerId,
                leaseDurationMs: 30_000,
                correlationId: 'c-1',
            }),
        );
    });

    it('replays a completed result without executing the UseCase', async () => {
        const store = createStore({
            type: 'completed',
            result: 'stored-result',
            completedAt: '2026-08-22T05:00:00.000Z',
        });
        const executor = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).resolves.toBe('stored-result');
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('rejects an active duplicate without executing the UseCase', async () => {
        const store = createStore({ type: 'already-in-progress', lease });
        const executor = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBeInstanceOf(UseCaseAlreadyInProgressError);
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('rejects an Intent conflict without executing the UseCase', async () => {
        const store = createStore({ type: 'intent-conflict', existingIntentId: 'other-intent' });
        const executor = createExecutor(store);
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(
            executor.execute({ useCase, input: 'input', intent, correlationId: 'c-1' }),
        ).rejects.toBeInstanceOf(UseCaseIntentConflictError);
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('executes a claimed UseCase, propagates correlationId, and completes with the claimed lease', async () => {
        const store = createStore({ type: 'claimed', lease });
        const executor = createExecutor(store);
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

    it('does not return an unpersisted result when fenced completion is rejected', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.complete = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['complete'];
        const executor = createExecutor(store);

        await expect(
            executor.execute({
                useCase: { execute: async () => 'result' },
                input: undefined,
                intent,
                correlationId: 'c-1',
            }),
        ).rejects.toBeInstanceOf(UseCaseExecutionTransitionError);
    });

    it('attempts fenced release on UseCase failure and preserves the original error', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.release = vi.fn(async () => {
            throw new Error('release failed');
        }) as UseCaseExecutionStore['release'];
        const originalError = new Error('use-case failed');
        const executor = createExecutor(store);

        await expect(
            executor.execute({
                useCase: {
                    execute: async () => {
                        throw originalError;
                    },
                },
                input: undefined,
                intent,
                correlationId: 'c-1',
            }),
        ).rejects.toBe(originalError);
        expect(store.release).toHaveBeenCalledWith(
            expect.objectContaining({ executionId, lease }),
        );
    });
});

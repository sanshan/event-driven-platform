import type { Clock } from '@event-driven-platform/clock';
import type {
    ExecutionId,
    ExecutionIdFactory,
    ExecutionLease,
    ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';
import type { UseCase, UseCaseContext } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it, vi } from 'vitest';

import { UseCaseClaimRejectedError } from '../errors/use-case-claim-rejected.error.js';
import { UseCaseExecutionTransitionError } from '../errors/use-case-execution-transition.error.js';
import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const useCaseName = 'TestUseCase';
const intent = { id: 'intent-1' } as Intent;
const context: UseCaseContext = { intent, correlationId: 'c-1' };
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-22T05:00:00.000Z',
    expiresAt: '2026-08-22T05:00:30.000Z',
} as ExecutionLease;
const clock: Clock = { now: () => '2026-08-22T05:00:00.000Z' };
const executionIdFactory: ExecutionIdFactory = { create: vi.fn(() => executionId) };

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
    try {
        await work();

        return null;
    } catch (error: unknown) {
        return error;
    }
}

function createExecutor(store: UseCaseExecutionStore) {
    return new DefaultUseCaseExecutor({ clock, executionIdFactory, store }, { leaseOwnerId });
}

function createStore(
    claimResult: Awaited<ReturnType<UseCaseExecutionStore['claim']>>,
): UseCaseExecutionStore {
    return {
        claim: vi.fn(async () => claimResult) as UseCaseExecutionStore['claim'],
        complete: vi.fn(async () => ({
            type: 'completed',
            completedAt: clock.now(),
        })) as UseCaseExecutionStore['complete'],
        release: vi.fn(async () => ({
            type: 'released',
            releasedAt: clock.now(),
        })) as UseCaseExecutionStore['release'],
    };
}

describe('DefaultUseCaseExecutor', () => {
    it('claims a new invocation with its Intent, correlation and fixed lease', async () => {
        const store = createStore({ type: 'claimed', lease });
        await createExecutor(store).execute({
            useCase: { name: useCaseName, execute: async () => 'result' },
            input: undefined,
            context,
        });

        expect(executionIdFactory.create).toHaveBeenCalledWith(intent.id);
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
        const store = createStore({
            type: 'completed',
            result: 'stored-result',
            completedAt: clock.now(),
        });
        const useCase: UseCase<string, string> = { name: useCaseName, execute: vi.fn() };

        await expect(
            createExecutor(store).execute({ useCase, input: 'input', context }),
        ).resolves.toBe('stored-result');
        expect(useCase.execute).not.toHaveBeenCalled();
        expect(store.complete).not.toHaveBeenCalled();
    });

    it('rejects an active duplicate without executing the UseCase', async () => {
        const store = createStore({ type: 'already-in-progress', lease });
        const useCase: UseCase<string, string> = { name: useCaseName, execute: vi.fn() };

        const error = await captureError(() =>
            createExecutor(store).execute({ useCase, input: 'input', context }),
        );

        expect(error).toBeInstanceOf(UseCaseClaimRejectedError);
        expect((error as UseCaseClaimRejectedError).reason).toBe('already-in-progress');
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('rejects an Intent conflict without executing the UseCase', async () => {
        const store = createStore({ type: 'intent-conflict', existingIntentId: 'other-intent' });
        const useCase: UseCase<string, string> = { name: useCaseName, execute: vi.fn() };

        const error = await captureError(() =>
            createExecutor(store).execute({ useCase, input: 'input', context }),
        );

        expect(error).toBeInstanceOf(UseCaseClaimRejectedError);
        expect((error as UseCaseClaimRejectedError).reason).toBe('intent-conflict');
        expect((error as UseCaseClaimRejectedError).existingIntentId).toBe('other-intent');
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('forwards a concrete invocation context unchanged and completes with the claimed lease', async () => {
        interface ConcreteContext extends UseCaseContext {
            readonly metadata: { readonly value: string };
        }

        const store = createStore({ type: 'claimed', lease });
        const concreteContext: ConcreteContext = {
            intent,
            correlationId: 'c-42',
            metadata: { value: 'opaque' },
        };
        const useCase: UseCase<string, string, ConcreteContext> = {
            name: useCaseName,
            execute: vi.fn(async () => 'result'),
        };

        await expect(
            createExecutor(store).execute({ useCase, input: 'input', context: concreteContext }),
        ).resolves.toBe('result');
        expect(useCase.execute).toHaveBeenCalledWith('input', concreteContext);
        expect(store.complete).toHaveBeenCalledWith({
            executionId,
            lease,
            result: 'result',
            completedAt: clock.now(),
        });
    });

    it('does not return success when fenced completion is rejected', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.complete = vi.fn(async () => ({
            type: 'lease-conflict',
        })) as UseCaseExecutionStore['complete'];

        await expect(
            createExecutor(store).execute({
                useCase: { name: useCaseName, execute: async () => 'result' },
                input: undefined,
                context,
            }),
        ).rejects.toBeInstanceOf(UseCaseExecutionTransitionError);
    });

    it('attempts fenced release on UseCase failure and preserves the original error', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.release = vi.fn(async () => {
            throw new Error('release failed');
        }) as UseCaseExecutionStore['release'];
        const originalError = new Error('use-case failed');

        await expect(
            createExecutor(store).execute({
                useCase: {
                    name: useCaseName,
                    execute: async () => {
                        throw originalError;
                    },
                },
                input: undefined,
                context,
            }),
        ).rejects.toBe(originalError);
        expect(store.release).toHaveBeenCalledWith({ executionId, lease, releasedAt: clock.now() });
    });
});

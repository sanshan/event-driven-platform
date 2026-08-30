import type { Clock } from '@event-driven-platform/clock';
import {
    ExecutionError,
    type ExecutionId,
    type ExecutionIdFactory,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';
import type { UseCase, UseCaseContext } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it, vi } from 'vitest';

import { UseCaseAlreadyInProgressError } from '../errors/use-case-already-in-progress.error.js';
import { UseCaseExecutionTransitionError } from '../errors/use-case-execution-transition.error.js';
import { UseCaseIntentConflictError } from '../errors/use-case-intent-conflict.error.js';
import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
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
        const store = createStore({ type: 'completed', result: 'stored-result', completedAt: clock.now() });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        await expect(createExecutor(store).execute({ useCase, input: 'input', context })).resolves.toBe('stored-result');
        expect(useCase.execute).not.toHaveBeenCalled();
        expect(store.complete).not.toHaveBeenCalled();
    });

    it('rejects an active duplicate with a caller-owned canonical conflict', async () => {
        const store = createStore({ type: 'already-in-progress', lease });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        const error = await createExecutor(store)
            .execute({ useCase, input: 'input', context })
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UseCaseAlreadyInProgressError);
        expect((error as UseCaseAlreadyInProgressError).executionFailure).toEqual({
            code: 'use-case-already-in-progress',
            message: `UseCase execution ${executionId} is already in progress.`,
            classification: 'conflict',
            retry: 'caller',
            retryable: false,
        });
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('rejects an Intent conflict with a non-retryable canonical conflict', async () => {
        const store = createStore({ type: 'intent-conflict', existingIntentId: 'other-intent' });
        const useCase: UseCase<string, string> = { execute: vi.fn() };

        const error = await createExecutor(store)
            .execute({ useCase, input: 'input', context })
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UseCaseIntentConflictError);
        expect((error as UseCaseIntentConflictError).executionFailure).toEqual({
            code: 'use-case-intent-conflict',
            message: `UseCase execution ${executionId} is associated with another Intent.`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
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
            execute: vi.fn(async () => 'result'),
        };

        await expect(createExecutor(store).execute({ useCase, input: 'input', context: concreteContext })).resolves.toBe('result');
        expect(useCase.execute).toHaveBeenCalledWith('input', concreteContext);
        expect(store.complete).toHaveBeenCalledWith({ executionId, lease, result: 'result', completedAt: clock.now() });
    });

    it('does not return success when fenced completion is rejected', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.complete = vi.fn(async () => ({ type: 'lease-conflict' })) as UseCaseExecutionStore['complete'];

        const error = await createExecutor(store)
            .execute({ useCase: { execute: async () => 'result' }, input: undefined, context })
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UseCaseExecutionTransitionError);
        expect((error as UseCaseExecutionTransitionError).executionFailure).toEqual({
            code: 'use-case-execution-transition-rejected',
            message: `UseCase execution ${executionId} complete transition was rejected: lease-conflict.`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
    });

    it('attempts fenced release and normalizes an unknown UseCase failure with its cause', async () => {
        const store = createStore({ type: 'claimed', lease });
        store.release = vi.fn(async () => { throw new Error('release failed'); }) as UseCaseExecutionStore['release'];
        const originalError = new Error('use-case failed');

        const error = await createExecutor(store)
            .execute({
                useCase: { execute: async () => { throw originalError; } },
                input: undefined,
                context,
            })
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).cause).toBe(originalError);
        expect((error as ExecutionError).executionFailure).toEqual({
            code: 'unexpected-execution-error',
            message: 'An unexpected execution error occurred.',
            classification: 'internal',
            retry: 'never',
            retryable: false,
        });
        expect(store.release).toHaveBeenCalledWith({ executionId, lease, releasedAt: clock.now() });
    });

    it('attempts fenced release and propagates a canonical UseCase failure unchanged', async () => {
        const store = createStore({ type: 'claimed', lease });
        const canonicalError = new ExecutionError({
            code: 'child-operation-failed',
            message: 'Child operation failed.',
            classification: 'unavailable',
            retry: 'caller',
            retryable: false,
        });

        const error = await createExecutor(store)
            .execute({
                useCase: { execute: async () => { throw canonicalError; } },
                input: undefined,
                context,
            })
            .catch((caught: unknown) => caught);

        expect(error).toBe(canonicalError);
        expect(store.release).toHaveBeenCalledWith({ executionId, lease, releasedAt: clock.now() });
    });
});

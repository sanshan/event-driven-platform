import type { Clock } from '@event-driven-platform/clock';
import type {
    ExecutionId,
    ExecutionIdFactory,
    ExecutionLease,
    ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';
import type {
    UseCaseExecutorObservation,
    UseCaseExecutorObserver,
} from '@event-driven-platform/observability';
import type { UseCaseContext } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const intent = { id: 'intent-1' } as Intent;
const context: UseCaseContext = { intent, correlationId: 'correlation-1' };
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-28T10:00:00.000Z',
    expiresAt: '2026-08-28T10:00:30.000Z',
} as ExecutionLease;
const clock: Clock = { now: () => '2026-08-28T10:00:00.000Z' };
const executionIdFactory: ExecutionIdFactory = { create: () => executionId };

class RecordingUseCaseExecutorObserver implements UseCaseExecutorObserver {
    readonly observations: UseCaseExecutorObservation[] = [];

    observe(observation: UseCaseExecutorObservation): undefined {
        this.observations.push(observation);
        return undefined;
    }
}

function createStore(
    claimResult: Awaited<ReturnType<UseCaseExecutionStore['claim']>>,
): UseCaseExecutionStore {
    return {
        claim: async () => claimResult,
        complete: async () => ({ type: 'completed', completedAt: clock.now() }),
        release: async () => ({ type: 'released', releasedAt: clock.now() }),
    } as UseCaseExecutionStore;
}

function createExecutor(store: UseCaseExecutionStore, observer: UseCaseExecutorObserver) {
    return new DefaultUseCaseExecutor(
        { clock, executionIdFactory, store, observer },
        { leaseOwnerId },
    );
}

describe('DefaultUseCaseExecutor observability', () => {
    it('emits the successful durable execution lifecycle', async () => {
        const observer = new RecordingUseCaseExecutorObserver();
        const executor = createExecutor(createStore({ type: 'claimed', lease }), observer);

        await executor.execute({
            useCase: { execute: async () => 'result' },
            input: undefined,
            context,
        });

        expect(observer.observations).toEqual([
            {
                type: 'execution.requested',
                context: { intentId: intent.id, correlationId: 'correlation-1' },
            },
            {
                type: 'claim.completed',
                context: expect.any(Object),
                outcome: 'claimed',
                durationMs: 0,
            },
            { type: 'execution.started', context: expect.any(Object) },
            {
                type: 'execution.completed',
                context: expect.any(Object),
                outcome: 'success',
                durationMs: 0,
            },
            {
                type: 'completion.completed',
                context: expect.any(Object),
                outcome: 'completed',
                durationMs: 0,
            },
        ]);
    });

    it('reports completed-result replay without starting UseCase execution', async () => {
        const observer = new RecordingUseCaseExecutorObserver();
        const executor = createExecutor(
            createStore({ type: 'completed', result: 'stored', completedAt: clock.now() }),
            observer,
        );

        await expect(
            executor.execute({
                useCase: { execute: async () => 'new' },
                input: undefined,
                context,
            }),
        ).resolves.toBe('stored');

        expect(observer.observations.map(({ type }) => type)).toEqual([
            'execution.requested',
            'claim.completed',
        ]);
        expect(observer.observations[1]).toMatchObject({ outcome: 'completed' });
    });

    it('reports failed execution and best-effort release failure', async () => {
        const observer = new RecordingUseCaseExecutorObserver();
        const store = createStore({ type: 'claimed', lease });
        store.release = async () => {
            throw new Error('store unavailable');
        };
        const executor = createExecutor(store, observer);
        const failure = new Error('use case failed');

        await expect(
            executor.execute({
                useCase: {
                    execute: async () => {
                        throw failure;
                    },
                },
                input: undefined,
                context,
            }),
        ).rejects.toBe(failure);

        expect(observer.observations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'execution.completed', outcome: 'error' }),
                expect.objectContaining({ type: 'release.completed', outcome: 'error' }),
            ]),
        );
    });

    it('contains observer failures without changing UseCase execution', async () => {
        const throwingObserver: UseCaseExecutorObserver = {
            observe: () => {
                throw new Error('telemetry unavailable');
            },
        };
        const executor = createExecutor(createStore({ type: 'claimed', lease }), throwingObserver);

        await expect(
            executor.execute({
                useCase: { execute: async () => 'result' },
                input: undefined,
                context,
            }),
        ).resolves.toBe('result');
    });
});

import { describe, expect, it } from 'vitest';

import { DefaultEventIdFactory } from '@event-driven-platform/event';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { RunnerObservation, RunnerObserver } from '@event-driven-platform/observability';
import { DefaultOutboxRecordFactory } from '@event-driven-platform/outbox';

import { DefaultRunner } from './runner/default-runner.js';
import type { RunnerDependencies } from './runner/runner-dependencies.js';
import {
    claimedEntry,
    command,
    createRunnerTestKit,
    FixedClock,
    leaseOwnerId,
    operation,
    successResult,
} from '../../test/runner-test-kit.js';

class RecordingRunnerObserver implements RunnerObserver {
    readonly observations: RunnerObservation[] = [];

    observe(observation: RunnerObservation): undefined {
        this.observations.push(observation);
        return undefined;
    }
}

function createObservedRunner(
    observer: RunnerObserver,
    dependencyOverrides: Partial<RunnerDependencies> = {},
) {
    const kit = createRunnerTestKit();
    const clock = new FixedClock();

    const runner = new DefaultRunner(
        {
            clock,
            executionIdFactory: kit.executionIdFactory,
            executionLogStore: kit.executionLogStore,
            operationHandlerResolver: kit.handlerResolver,
            executionTransaction: kit.executionTransaction,
            operationEventEnvelopeFactory: new DefaultOperationEventEnvelopeFactory(
                clock,
                new DefaultEventIdFactory(),
            ),
            outboxRecordFactory: new DefaultOutboxRecordFactory(clock),
            outboxStore: kit.outboxStore,
            observer,
            ...dependencyOverrides,
        },
        { leaseOwnerId },
        { leaseDurationMs: 60_000 },
    );

    return { kit, runner };
}

describe('DefaultRunner observability', () => {
    it('emits the successful execution lifecycle with stable context', async () => {
        const observer = new RecordingRunnerObserver();
        const { runner } = createObservedRunner(observer);

        await runner.execute(command);

        expect(observer.observations).toEqual([
            {
                type: 'execution.requested',
                context: {
                    operation: operation.name,
                    tenant: operation.tenant,
                    intentId: operation.intent.id,
                    correlationId: command.context.correlationId,
                },
            },
            {
                type: 'execution.started',
                context: expect.any(Object),
            },
            {
                type: 'attempt.started',
                context: expect.any(Object),
                attempt: 1,
            },
            {
                type: 'attempt.completed',
                context: expect.any(Object),
                attempt: 1,
                outcome: 'success',
                retryable: false,
                durationMs: 0,
            },
            {
                type: 'execution.completed',
                context: expect.any(Object),
                outcome: 'success',
                durationMs: 0,
            },
        ]);
    });

    it('emits idempotency and claim rejection facts without starting execution', async () => {
        const storedObserver = new RecordingRunnerObserver();
        const stored = createObservedRunner(storedObserver);

        stored.kit.executionLogStore.claimResult = {
            type: 'completed',
            entry: {
                ...stored.kit.executionLogStore.claimResult.entry,
                latestAttempt: {
                    ...stored.kit.executionLogStore.claimResult.entry.latestAttempt,
                    status: 'completed',
                    failure: null,
                    finishedAt: '2026-07-18T10:00:01.000Z',
                },
                lease: null,
                result: successResult,
                finishedAt: '2026-07-18T10:00:01.000Z',
            } as never,
        };

        await stored.runner.execute(command);

        expect(storedObserver.observations.map(({ type }) => type)).toEqual([
            'execution.requested',
            'idempotency.hit',
        ]);

        const rejectedObserver = new RecordingRunnerObserver();
        const rejected = createObservedRunner(rejectedObserver);

        rejected.kit.executionLogStore.claimResult = {
            type: 'already-in-progress',
            entry: claimedEntry,
        };

        await expect(rejected.runner.execute(command)).rejects.toThrow();

        expect(rejectedObserver.observations).toEqual([
            expect.objectContaining({ type: 'execution.requested' }),
            expect.objectContaining({
                type: 'claim.rejected',
                reason: 'already-in-progress',
            }),
        ]);
    });

    it('emits failed attempt and retry facts before the next attempt', async () => {
        const observer = new RecordingRunnerObserver();
        const state: { kit?: ReturnType<typeof createRunnerTestKit> } = {};
        const retryDelay = {
            wait: async () => {
                if (state.kit !== undefined) {
                    state.kit.handler.error = null;
                }
            },
        };

        const created = createObservedRunner(observer, { retryDelay });
        state.kit = created.kit;
        created.kit.handler.error = {
            executionFailure: {
                code: 'transient-test-failure',
                message: 'transient',
                classification: 'unavailable',
                retry: 'current-execution',
                retryable: true,
            },
        };

        await created.runner.execute({
            ...command,
            options: {
                retry: {
                    maxAttempts: 2,
                    strategy: { type: 'fixed', delayMs: 1 },
                },
            },
        });

        expect(observer.observations.map(({ type }) => type)).toEqual([
            'execution.requested',
            'execution.started',
            'attempt.started',
            'attempt.completed',
            'retry.scheduled',
            'attempt.started',
            'attempt.completed',
            'execution.completed',
        ]);
    });

    it('contains observer failures inside Runner observability', async () => {
        const throwingObserver: RunnerObserver = {
            observe: () => {
                throw new Error('telemetry unavailable');
            },
        };
        const { runner } = createObservedRunner(throwingObserver);

        await expect(runner.execute(command)).resolves.toBe(successResult);
    });
});

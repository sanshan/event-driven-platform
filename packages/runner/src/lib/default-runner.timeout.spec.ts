import { describe, expect, it } from 'vitest';

import { ExecutionError, type ExecutionIdFactory } from '@event-driven-platform/execution';
import type { AnyExecutionLogEntry } from '@event-driven-platform/execution-log';
import type {
    ClaimExecutionRequest,
    ClaimExecutionResult,
    CompleteExecutionRequest,
    CompleteExecutionResult,
    ExecutionLogStore,
    FailExecutionRequest,
    FailExecutionResult,
} from '@event-driven-platform/execution-log-store';
import type {
    ExecutionTransaction,
    ExecutionTransactionWork,
} from '@event-driven-platform/execution-transaction';
import type { AnyOperation } from '@event-driven-platform/operation';
import type { OperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandler } from '@event-driven-platform/operation-handler';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import type { OutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';

import {
    createRunner,
    ExecutionTimedOutError,
    type ExecutionTimeout,
    type ExecutionTimeoutResult,
} from '../index.js';
import {
    claimedEntry,
    command,
    type CreateWalletCommand,
    type CreateWalletOperation,
    executionId,
    leaseOwnerId,
    successResult,
} from '../../test/runner-test-kit.js';

class ControlledExecutionTimeout implements ExecutionTimeout {
    readonly receivedTimeouts: number[] = [];

    timedOut = false;

    async execute<TResult>(
        work: () => Promise<TResult>,
        timeoutMs: number,
    ): Promise<ExecutionTimeoutResult<TResult>> {
        this.receivedTimeouts.push(timeoutMs);

        if (this.timedOut) {
            void work().catch(() => undefined);

            return {
                type: 'timed-out',
            };
        }

        return {
            type: 'completed',
            result: await work(),
        };
    }
}

class TimeoutTestExecutionLogStore implements ExecutionLogStore {
    readonly completeAttempts: CompleteExecutionRequest<CreateWalletOperation>[] = [];

    readonly failAttempts: FailExecutionRequest[] = [];

    async claim<TOperation extends AnyOperation>(
        _request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>> {
        return {
            type: 'claimed',
            entry: claimedEntry,
        } as ClaimExecutionResult<TOperation>;
    }

    async complete<TOperation extends AnyOperation>(
        request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>> {
        this.completeAttempts.push(request as CompleteExecutionRequest<CreateWalletOperation>);

        return {
            type: 'completed',
            entry: {} as never,
        };
    }

    async fail<TOperation extends AnyOperation>(
        request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>> {
        this.failAttempts.push(request);

        return {
            type: 'failed',
            entry: {} as never,
        };
    }

    async findByIntentId(_intentId: string): Promise<AnyExecutionLogEntry | null> {
        return null;
    }
}

interface TimeoutRunnerTestKit {
    readonly runner: ReturnType<typeof createRunner>;
    readonly timeout: ControlledExecutionTimeout;
    readonly executionLogStore: TimeoutTestExecutionLogStore;
    readonly transactionOutcomes: Array<'commit' | 'rollback' | 'throw'>;
    readonly handlerInvocations: { count: number };
    readonly outboxAppends: { count: number };
    readonly handlerFailure: { error: unknown };
}

function createTimeoutRunnerTestKit(): TimeoutRunnerTestKit {
    const timeout = new ControlledExecutionTimeout();
    const executionLogStore = new TimeoutTestExecutionLogStore();
    const transactionOutcomes: Array<'commit' | 'rollback' | 'throw'> = [];
    const handlerInvocations = { count: 0 };
    const outboxAppends = { count: 0 };
    const handlerFailure: { error: unknown } = {
        error: null,
    };

    const executionIdFactory: ExecutionIdFactory = {
        create: () => executionId,
    };

    const handler: OperationHandler<CreateWalletOperation> = {
        async execute(): Promise<typeof successResult> {
            handlerInvocations.count += 1;

            if (handlerFailure.error !== null) {
                throw handlerFailure.error;
            }

            return successResult;
        },
    };

    const operationHandlerResolver: OperationHandlerResolver = {
        resolve<TOperation extends AnyOperation>(): OperationHandler<TOperation> {
            return handler as unknown as OperationHandler<TOperation>;
        },
    };

    const executionTransaction: ExecutionTransaction = {
        async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult> {
            try {
                const outcome = await work();
                transactionOutcomes.push(outcome.type);

                return outcome.result;
            } catch (error: unknown) {
                transactionOutcomes.push('throw');

                throw error;
            }
        },
    };

    const operationEventEnvelopeFactory: OperationEventEnvelopeFactory = {
        createMany: () => [],
    };

    const outboxRecordFactory: OutboxRecordFactory = {
        createMany: () => [],
    };

    const outboxStore: OutboxStore = {
        async append(): Promise<void> {
            outboxAppends.count += 1;
        },
    };

    const runner = createRunner({
        dependencies: {
            clock: {
                now: () => '2026-07-18T10:00:00.000Z',
            },
            executionIdFactory,
            executionLogStore,
            executionTimeout: timeout,
            operationHandlerResolver,
            executionTransaction,
            operationEventEnvelopeFactory,
            outboxRecordFactory,
            outboxStore,
        },
        runtime: {
            leaseOwnerId,
        },
        options: {
            leaseDurationMs: 60_000,
        },
    });

    return {
        runner,
        timeout,
        executionLogStore,
        transactionOutcomes,
        handlerInvocations,
        outboxAppends,
        handlerFailure,
    };
}

function timedCommand(timeoutMs = 250): CreateWalletCommand {
    return {
        ...command,
        options: {
            timeoutMs,
        },
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

describe('DefaultRunner timeout orchestration', () => {
    it('commits normally when the Handler completes before timeout', async () => {
        const kit = createTimeoutRunnerTestKit();

        await kit.runner.execute(timedCommand(500));

        expect(kit.timeout.receivedTimeouts).toEqual([500]);
        expect(kit.handlerInvocations.count).toBe(1);
        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);
        expect(kit.outboxAppends.count).toBe(1);
        expect(kit.executionLogStore.failAttempts).toEqual([]);
        expect(kit.transactionOutcomes).toEqual(['commit']);
    });

    it('rolls back the handler transaction and records a timed-out attempt', async () => {
        const kit = createTimeoutRunnerTestKit();

        kit.timeout.timedOut = true;

        const error = await captureError(() => kit.runner.execute(timedCommand(250)));

        expect(error).toBeInstanceOf(ExecutionTimedOutError);
        expect(kit.handlerInvocations.count).toBe(1);
        expect(kit.executionLogStore.completeAttempts).toEqual([]);
        expect(kit.outboxAppends.count).toBe(0);
        expect(kit.executionLogStore.failAttempts).toHaveLength(1);
        expect(kit.executionLogStore.failAttempts[0]).toMatchObject({
            status: 'timed-out',
            failure: {
                code: 'execution-timed-out',
                classification: 'timeout',
                retry: 'current-execution',
                retryable: true,
            },
        });
        expect(kit.transactionOutcomes).toEqual(['throw', 'commit']);
    });

    it('keeps ordinary Handler failures as failed rather than timed-out', async () => {
        const kit = createTimeoutRunnerTestKit();
        const handlerError = new Error('Handler persistence failed.');

        kit.handlerFailure.error = handlerError;

        const error = await captureError(() => kit.runner.execute(timedCommand()));

        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).cause).toBe(handlerError);
        expect(kit.executionLogStore.failAttempts[0]?.status).toBe('failed');
        expect(kit.executionLogStore.failAttempts[0]?.failure.retry).toBe('never');
    });
});

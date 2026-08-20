import { describe, expect, it } from 'vitest';

import type { CommandOptions } from '@event-driven-platform/command';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
import type {
    AnyExecutionLogEntry,
    InProgressExecutionLogEntry,
} from '@event-driven-platform/execution-log';
import type {
    ClaimExecutionRequest,
    ClaimExecutionResult,
    CompleteExecutionRequest,
    CompleteExecutionResult,
    ExecutionLogStore,
    FailExecutionRequest,
    FailExecutionResult,
} from '@event-driven-platform/execution-log-store';
import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';
import type { AnyOperation } from '@event-driven-platform/operation';
import type { OperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandler } from '@event-driven-platform/operation-handler';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import type { OutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';

import {
    createRunner,
    ExecutionGuardRejectedError,
    GuardEvaluatorUnavailableError,
    type GuardEvaluationRequest,
    type GuardEvaluator,
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

type ConfiguredGuard = NonNullable<CommandOptions['guards']>[number];

const firstGuard: ConfiguredGuard = {
    name: 'actor-enabled',
};

const secondGuard: ConfiguredGuard = {
    name: 'wallet-enabled',
    rejectWith: {
        code: 'wallet-disabled',
        reason: 'Wallet execution is disabled.',
    },
};

class RecordingGuardEvaluator implements GuardEvaluator {
    readonly requests: GuardEvaluationRequest<CreateWalletOperation>[] = [];

    results: boolean[] = [];

    error: unknown = null;

    async evaluate<TOperation extends AnyOperation>(
        request: GuardEvaluationRequest<TOperation>,
    ): Promise<boolean> {
        this.requests.push(request as GuardEvaluationRequest<CreateWalletOperation>);

        if (this.error !== null) {
            throw this.error;
        }

        return this.results.shift() ?? true;
    }
}

class GuardTestExecutionLogStore implements ExecutionLogStore {
    readonly claimRequests: ClaimExecutionRequest<CreateWalletOperation>[] = [];

    readonly completedRequests: CompleteExecutionRequest<CreateWalletOperation>[] = [];

    readonly failedRequests: FailExecutionRequest[] = [];

    claimResult: ClaimExecutionResult<CreateWalletOperation> = {
        type: 'claimed',
        entry: claimedEntry,
    };

    async claim<TOperation extends AnyOperation>(
        request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>> {
        this.claimRequests.push(request as ClaimExecutionRequest<CreateWalletOperation>);

        return this.claimResult as ClaimExecutionResult<TOperation>;
    }

    async complete<TOperation extends AnyOperation>(
        request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>> {
        this.completedRequests.push(request as CompleteExecutionRequest<CreateWalletOperation>);

        return {
            type: 'completed',
            entry: {} as never,
        };
    }

    async fail<TOperation extends AnyOperation>(
        request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>> {
        this.failedRequests.push(request);

        return {
            type: 'failed',
            entry: {} as never,
        };
    }

    async findByIntentId(_intentId: string): Promise<AnyExecutionLogEntry | null> {
        return null;
    }
}

interface GuardRunnerTestKit {
    readonly runner: ReturnType<typeof createRunner>;
    readonly evaluator: RecordingGuardEvaluator;
    readonly executionLogStore: GuardTestExecutionLogStore;
    readonly handlerInvocations: { count: number };
    readonly resolverInvocations: { count: number };
    readonly outboxAppends: { count: number };
}

function createGuardRunnerTestKit(includeEvaluator = true): GuardRunnerTestKit {
    const evaluator = new RecordingGuardEvaluator();
    const executionLogStore = new GuardTestExecutionLogStore();
    const handlerInvocations = { count: 0 };
    const resolverInvocations = { count: 0 };
    const outboxAppends = { count: 0 };

    const executionIdFactory: ExecutionIdFactory = {
        create: () => executionId,
    };

    const handler: OperationHandler<CreateWalletOperation> = {
        execute: async () => {
            handlerInvocations.count += 1;

            return successResult;
        },
    };

    const operationHandlerResolver: OperationHandlerResolver = {
        resolve<TOperation extends AnyOperation>(): OperationHandler<TOperation> {
            resolverInvocations.count += 1;

            return handler as unknown as OperationHandler<TOperation>;
        },
    };

    const executionTransaction: ExecutionTransaction = {
        async execute<TResult>(work): Promise<TResult> {
            const outcome = await work();

            return outcome.result;
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
            ...(includeEvaluator ? { guardEvaluator: evaluator } : {}),
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
        evaluator,
        executionLogStore,
        handlerInvocations,
        resolverInvocations,
        outboxAppends,
    };
}

function guardedCommand(guards: readonly ConfiguredGuard[]): CreateWalletCommand {
    return {
        ...command,
        options: {
            guards,
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

describe('DefaultRunner guard orchestration', () => {
    it('evaluates guards sequentially before resolving or executing the Handler', async () => {
        const kit = createGuardRunnerTestKit();

        kit.evaluator.results = [true, true];

        await kit.runner.execute(guardedCommand([firstGuard, secondGuard]));

        expect(kit.evaluator.requests.map((request) => request.guard.name)).toEqual([
            'actor-enabled',
            'wallet-enabled',
        ]);
        expect(kit.evaluator.requests.every((request) => request.operation === command.operation)).toBe(
            true,
        );
        expect(kit.resolverInvocations.count).toBe(1);
        expect(kit.handlerInvocations.count).toBe(1);
        expect(kit.executionLogStore.completedRequests).toHaveLength(1);
        expect(kit.executionLogStore.failedRequests).toEqual([]);
        expect(kit.outboxAppends.count).toBe(1);
    });

    it('short-circuits on the first rejected guard and records the claimed attempt as failed', async () => {
        const kit = createGuardRunnerTestKit();

        kit.evaluator.results = [true, false, true];

        const error = await captureError(() =>
            kit.runner.execute(guardedCommand([firstGuard, secondGuard, firstGuard])),
        );

        expect(error).toBeInstanceOf(ExecutionGuardRejectedError);
        expect(kit.evaluator.requests.map((request) => request.guard.name)).toEqual([
            'actor-enabled',
            'wallet-enabled',
        ]);
        expect(kit.resolverInvocations.count).toBe(0);
        expect(kit.handlerInvocations.count).toBe(0);
        expect(kit.executionLogStore.completedRequests).toEqual([]);
        expect(kit.outboxAppends.count).toBe(0);
        expect(kit.executionLogStore.failedRequests).toHaveLength(1);
        expect(kit.executionLogStore.failedRequests[0]?.failure).toEqual({
            code: 'wallet-disabled',
            message: 'Wallet execution is disabled.',
            retryable: false,
        });
    });

    it('uses stable default rejection metadata when rejectWith is omitted', async () => {
        const kit = createGuardRunnerTestKit();

        kit.evaluator.results = [false];

        const error = await captureError(() => kit.runner.execute(guardedCommand([firstGuard])));

        expect(error).toBeInstanceOf(ExecutionGuardRejectedError);
        expect(kit.executionLogStore.failedRequests[0]?.failure).toEqual({
            code: 'guard-rejected',
            message: 'Guard "actor-enabled" rejected execution.',
            retryable: false,
        });
    });

    it('records evaluator infrastructure failures through the existing failure path', async () => {
        const kit = createGuardRunnerTestKit();

        const evaluatorError = {
            executionFailure: {
                code: 'guard-provider-unavailable',
                message: 'Guard provider is unavailable.',
                retryable: true,
            },
        };

        kit.evaluator.error = evaluatorError;

        const error = await captureError(() => kit.runner.execute(guardedCommand([firstGuard])));

        expect(error).toBe(evaluatorError);
        expect(kit.resolverInvocations.count).toBe(0);
        expect(kit.handlerInvocations.count).toBe(0);
        expect(kit.executionLogStore.failedRequests[0]?.failure).toEqual(
            evaluatorError.executionFailure,
        );
    });

    it('fails explicitly when guards are configured without a GuardEvaluator', async () => {
        const kit = createGuardRunnerTestKit(false);

        const error = await captureError(() => kit.runner.execute(guardedCommand([firstGuard])));

        expect(error).toBeInstanceOf(GuardEvaluatorUnavailableError);
        expect(kit.resolverInvocations.count).toBe(0);
        expect(kit.handlerInvocations.count).toBe(0);
        expect(kit.executionLogStore.failedRequests[0]?.failure).toEqual({
            code: 'guard-evaluator-unavailable',
            message: 'Guard evaluation is configured but no GuardEvaluator is available.',
            retryable: false,
        });
    });
});

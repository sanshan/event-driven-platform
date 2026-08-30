import { describe, expect, it } from 'vitest';

import type { CommandOptions } from '@event-driven-platform/command';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
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
    ExecutionGuardRejectedError,
    ExecutionPolicyUnavailableError,
    ExecutionRateLimitRejectedError,
    type GuardEvaluator,
    type RateLimitConsumeRequest,
    type RateLimitDecision,
    type RateLimiter,
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
type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

const allowGuard: ConfiguredGuard = {
    name: 'wallet-enabled',
};

const defaultRateLimit: ConfiguredRateLimit = {
    key: 'wallet-create',
    scope: 'actor',
    limit: 10,
    windowMs: 60_000,
};

class RecordingRateLimiter implements RateLimiter {
    readonly requests: RateLimitConsumeRequest[] = [];

    decision: RateLimitDecision = {
        type: 'allowed',
    };

    async consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision> {
        this.requests.push(request);

        return this.decision;
    }
}

class RateLimitTestExecutionLogStore implements ExecutionLogStore {
    readonly failedRequests: FailExecutionRequest[] = [];

    readonly completedRequests: CompleteExecutionRequest<CreateWalletOperation>[] = [];

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

interface RateLimitRunnerTestKit {
    readonly runner: ReturnType<typeof createRunner>;
    readonly limiter: RecordingRateLimiter;
    readonly executionLogStore: RateLimitTestExecutionLogStore;
    readonly handlerInvocations: { count: number };
    readonly outboxAppends: { count: number };
    readonly guardInvocations: { count: number };
}

function createRateLimitRunnerTestKit(options?: {
    readonly includeLimiter?: boolean;
    readonly guardResult?: boolean;
}): RateLimitRunnerTestKit {
    const limiter = new RecordingRateLimiter();
    const executionLogStore = new RateLimitTestExecutionLogStore();
    const handlerInvocations = { count: 0 };
    const outboxAppends = { count: 0 };
    const guardInvocations = { count: 0 };

    const executionIdFactory: ExecutionIdFactory = {
        create: () => executionId,
    };

    const guardEvaluator: GuardEvaluator = {
        async evaluate(): Promise<boolean> {
            guardInvocations.count += 1;

            return options?.guardResult ?? true;
        },
    };

    const handler: OperationHandler<CreateWalletOperation> = {
        async execute(): Promise<typeof successResult> {
            handlerInvocations.count += 1;

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
            guardEvaluator,
            ...(options?.includeLimiter === false ? {} : { rateLimiter: limiter }),
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
        limiter,
        executionLogStore,
        handlerInvocations,
        outboxAppends,
        guardInvocations,
    };
}

function rateLimitedCommand(
    rateLimit: ConfiguredRateLimit = defaultRateLimit,
    guards?: readonly ConfiguredGuard[],
): CreateWalletCommand {
    return {
        ...command,
        options: {
            rateLimit,
            ...(guards === undefined ? {} : { guards }),
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

describe('DefaultRunner rate-limit orchestration', () => {
    it('consumes normalized capacity before executing the Handler', async () => {
        const kit = createRateLimitRunnerTestKit();

        await kit.runner.execute(
            rateLimitedCommand({
                ...defaultRateLimit,
                scope: 'tenant',
                cost: 3,
            }),
        );

        expect(kit.limiter.requests).toEqual([
            {
                bucketKey: 'wallet-create|tenant|merchant|merchant-1',
                limit: 10,
                windowMs: 60_000,
                cost: 3,
            },
        ]);
        expect(kit.handlerInvocations.count).toBe(1);
        expect(kit.executionLogStore.completedRequests).toHaveLength(1);
    });

    it('records rate-limit rejection without executing the Handler or Outbox', async () => {
        const kit = createRateLimitRunnerTestKit();

        kit.limiter.decision = {
            type: 'rejected',
        };

        const error = await captureError(() => kit.runner.execute(rateLimitedCommand()));

        expect(error).toBeInstanceOf(ExecutionRateLimitRejectedError);
        expect(kit.handlerInvocations.count).toBe(0);
        expect(kit.outboxAppends.count).toBe(0);
        expect(kit.executionLogStore.completedRequests).toEqual([]);
        expect(kit.executionLogStore.failedRequests).toHaveLength(1);
    });

    it('fails explicitly when rate limiting is configured without a RateLimiter', async () => {
        const kit = createRateLimitRunnerTestKit({
            includeLimiter: false,
        });

        const error = await captureError(() => kit.runner.execute(rateLimitedCommand()));

        expect(error).toBeInstanceOf(ExecutionPolicyUnavailableError);
        expect((error as ExecutionPolicyUnavailableError).policy).toBe('rate-limit');
        expect(kit.handlerInvocations.count).toBe(0);
        expect(kit.executionLogStore.failedRequests).toHaveLength(1);
    });

    it('does not consume rate-limit capacity when a guard rejects admission first', async () => {
        const kit = createRateLimitRunnerTestKit({
            guardResult: false,
        });

        const error = await captureError(() =>
            kit.runner.execute(rateLimitedCommand(defaultRateLimit, [allowGuard])),
        );

        expect(error).toBeInstanceOf(ExecutionGuardRejectedError);
        expect(kit.guardInvocations.count).toBe(1);
        expect(kit.limiter.requests).toEqual([]);
        expect(kit.handlerInvocations.count).toBe(0);
    });
});

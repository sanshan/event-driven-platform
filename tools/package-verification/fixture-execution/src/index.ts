import { DefaultActorFactory } from '@event-driven-platform/actor';
import { DefaultAggregateReferenceFactory } from '@event-driven-platform/aggregate-reference';
import { SystemClock } from '@event-driven-platform/clock';
import type { Command } from '@event-driven-platform/command';
import {
    DefaultExecutionIdFactory,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';
import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';
import { DefaultEventIdFactory } from '@event-driven-platform/event';
import { DefaultIntentFactory } from '@event-driven-platform/intent';
import type { Operation, OperationResultOf } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import { OperationResults } from '@event-driven-platform/operation-result';
import { DefaultOutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';
import {
    createRunner,
    type ExecutionTimeout,
    type GuardEvaluator,
    type RateLimiter,
    type RetryDelay,
} from '@event-driven-platform/runner';
import { DefaultSubjectFactory } from '@event-driven-platform/subject';
import { DefaultTenantReferenceFactory } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

type TenantId = Brand<string, 'TenantId'>;
type AccountId = Brand<string, 'AccountId'>;

const tenant = new DefaultTenantReferenceFactory().create({
    type: 'tenant',
    id: 'tenant-1' as TenantId,
});

const aggregate = new DefaultAggregateReferenceFactory().create({
    type: 'account',
    id: 'account-1' as AccountId,
});

const actor = new DefaultActorFactory().create({
    type: 'service',
    id: 'release-verification',
});

const subject = new DefaultSubjectFactory().create({
    type: 'account',
    id: 'account-1',
});

const intent = new DefaultIntentFactory().create({
    namespace: 'release-verification',
    action: 'execute',
    version: 1,
    tenant,
    components: {
        aggregateId: aggregate.id,
    },
});

const successResult = OperationResults.success({
    data: {
        verified: true,
    },
    events: [],
});

type VerificationOperation = Operation<
    'VerifyPublishedExecution',
    1,
    typeof tenant,
    typeof aggregate,
    { readonly source: 'local-registry' },
    typeof successResult
>;

const operation: VerificationOperation = {
    name: 'VerifyPublishedExecution',
    schemaVersion: 1,
    intent,
    actor,
    tenant,
    subject,
    aggregate,
    payload: {
        source: 'local-registry',
    },
};

class RetryableFixtureError extends Error {
    readonly executionFailure = {
        code: 'fixture-retry',
        message: 'The fixture intentionally fails its first handler attempt.',
        retryable: true,
    } as const;
}

let claimCount = 0;
let failCount = 0;
let completeCount = 0;
let handlerCount = 0;
let guardCount = 0;
let rateLimitCount = 0;
let timeoutCount = 0;
let retryDelayCount = 0;
let outboxAppendCount = 0;

const clock = new SystemClock();

const executionLogStore = {
    async claim(request: {
        executionId: unknown;
        operation: VerificationOperation;
        correlationId: string;
        leaseOwnerId: ExecutionLeaseOwnerId;
        leaseDurationMs: number;
        requestedAt: Date;
    }) {
        claimCount += 1;

        return {
            type: 'claimed',
            entry: {
                status: 'in-progress',
                executionId: request.executionId,
                operation: request.operation,
                correlationId: request.correlationId,
                attemptCount: claimCount,
                latestAttempt: {
                    status: 'in-progress',
                    attemptId: `attempt-${claimCount}`,
                    attemptNumber: claimCount,
                },
                lease: {
                    ownerId: request.leaseOwnerId,
                    version: claimCount,
                    acquiredAt: request.requestedAt,
                    expiresAt: new Date(request.requestedAt.getTime() + request.leaseDurationMs),
                },
            },
        };
    },
    async complete() {
        completeCount += 1;
        return { type: 'completed', entry: {} };
    },
    async fail() {
        failCount += 1;
        return { type: 'failed', entry: {} };
    },
    async findByIntentId() {
        return null;
    },
} as unknown as ExecutionLogStore;

const executionTransaction = {
    async execute<TResult>(work: () => Promise<{ readonly result: TResult }>): Promise<TResult> {
        const outcome = await work();
        return outcome.result;
    },
} as unknown as ExecutionTransaction;

const operationHandlerResolver = {
    resolve() {
        return {
            async execute(): Promise<OperationResultOf<VerificationOperation>> {
                handlerCount += 1;

                if (handlerCount === 1) {
                    throw new RetryableFixtureError();
                }

                return successResult;
            },
        };
    },
} as unknown as OperationHandlerResolver;

const guardEvaluator: GuardEvaluator = {
    async evaluate() {
        guardCount += 1;
        return true;
    },
};

const rateLimiter: RateLimiter = {
    async consume() {
        rateLimitCount += 1;
        return { type: 'allowed' };
    },
};

const executionTimeout: ExecutionTimeout = {
    async execute<TResult>(work: () => Promise<TResult>) {
        timeoutCount += 1;
        return {
            type: 'completed',
            result: await work(),
        };
    },
};

const retryDelay: RetryDelay = {
    async wait() {
        retryDelayCount += 1;
    },
};

const outboxStore = {
    async append(records: readonly unknown[]) {
        outboxAppendCount += records.length;
    },
} as unknown as OutboxStore;

const runner = createRunner({
    dependencies: {
        clock,
        executionIdFactory: new DefaultExecutionIdFactory(),
        executionLogStore,
        executionTimeout,
        guardEvaluator,
        rateLimiter,
        retryDelay,
        operationHandlerResolver,
        executionTransaction,
        operationEventEnvelopeFactory: new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        ),
        outboxRecordFactory: new DefaultOutboxRecordFactory(clock),
        outboxStore,
    },
    runtime: {
        leaseOwnerId: 'fixture-runner' as ExecutionLeaseOwnerId,
    },
    options: {
        leaseDurationMs: 30_000,
    },
});

const command: Command<VerificationOperation> = {
    operation,
    context: {
        correlationId: 'release-verification-correlation',
    },
    options: {
        guards: [
            {
                name: 'fixture-guard',
            },
        ],
        rateLimit: {
            key: 'fixture-execution',
            scope: 'actor',
            limit: 10,
            windowMs: 60_000,
            cost: 1,
        },
        timeoutMs: 1_000,
        retry: {
            maxAttempts: 2,
            strategy: {
                type: 'fixed',
                delayMs: 1,
            },
        },
    },
};

const result = await runner.execute(command);

if (
    result.status !== 'success' ||
    result.data.verified !== true ||
    claimCount !== 2 ||
    failCount !== 1 ||
    completeCount !== 1 ||
    handlerCount !== 2 ||
    guardCount !== 1 ||
    rateLimitCount !== 1 ||
    timeoutCount !== 2 ||
    retryDelayCount !== 1 ||
    outboxAppendCount !== 0
) {
    throw new Error(
        `Published Execution verification failed: ${JSON.stringify({
            status: result.status,
            claimCount,
            failCount,
            completeCount,
            handlerCount,
            guardCount,
            rateLimitCount,
            timeoutCount,
            retryDelayCount,
            outboxAppendCount,
        })}`,
    );
}

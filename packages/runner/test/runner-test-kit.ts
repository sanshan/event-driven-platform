import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Clock } from '@event-driven-platform/clock';
import type { Command } from '@event-driven-platform/command';
import {
    type ExecutionAttemptId,
    type ExecutionId,
    type ExecutionIdFactory,
    type ExecutionLeaseOwnerId,
    type ExecutionLeaseVersion,
} from '@event-driven-platform/execution';
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
import type {
    ExecutionTransaction,
    ExecutionTransactionOutcome,
    ExecutionTransactionWork,
} from '@event-driven-platform/execution-transaction';
import { DefaultEventIdFactory, type Event } from '@event-driven-platform/event';
import type { AnyOperation, Operation } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandler } from '@event-driven-platform/operation-handler';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import type {
    CommittedOperationRejection,
    RolledBackOperationRejection,
    SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';
import { type AnyOutboxRecord, DefaultOutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import { createRunner, type Runner } from '../src/index.js';

export type MerchantId = Brand<string, 'MerchantId'>;

export type WalletId = Brand<string, 'WalletId'>;

export type MerchantTenant = TenantReference<'merchant', MerchantId>;

export type WalletAggregate = AggregateReference<'wallet', WalletId>;

export interface CreateWalletPayload {
    readonly currency: string;
}

export interface CreateWalletData {
    readonly walletId: WalletId;
}

export interface WalletCreatedPayload {
    readonly walletId: WalletId;

    readonly currency: string;
}

export type WalletCreatedEvent = Event<'wallet.created', 1, WalletCreatedPayload>;

export type CreateWalletSuccess = SuccessfulOperationResult<CreateWalletData, WalletCreatedEvent>;

export type CreateWalletCommittedRejection = CommittedOperationRejection<
    {
        readonly code: 'wallet-already-exists';
    },
    {
        readonly walletId: WalletId;
    },
    WalletCreatedEvent
>;

export type CreateWalletRolledBackRejection = RolledBackOperationRejection<
    {
        readonly code: 'wallet-blocked';
    },
    {
        readonly walletId: WalletId;
    }
>;

export type CreateWalletResult =
    CreateWalletSuccess | CreateWalletCommittedRejection | CreateWalletRolledBackRejection;

export type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

export type CreateWalletCommand = Command<CreateWalletOperation>;

export const executionId = 'execution-1' as ExecutionId;

export const attemptId = 'attempt-1' as ExecutionAttemptId;

export const leaseOwnerId = 'runner-1' as ExecutionLeaseOwnerId;

export const leaseVersion = 1 as ExecutionLeaseVersion;

export const merchantId = 'merchant-1' as MerchantId;

export const walletId = 'wallet-1' as WalletId;

export const walletCreatedEvent: WalletCreatedEvent = {
    name: 'wallet.created',
    schemaVersion: 1,
    payload: {
        walletId,
        currency: 'EUR',
    },
};

export const successResult: CreateWalletSuccess = {
    status: 'success',
    data: {
        walletId,
    },
    events: [walletCreatedEvent],
};

export const committedRejectionResult: CreateWalletCommittedRejection = {
    status: 'rejected',
    completion: 'committed',
    reason: {
        code: 'wallet-already-exists',
    },
    data: {
        walletId,
    },
    events: [walletCreatedEvent],
};

export const rolledBackRejectionResult: CreateWalletRolledBackRejection = {
    status: 'rejected',
    completion: 'rolled-back',
    reason: {
        code: 'wallet-blocked',
    },
    data: {
        walletId,
    },
    events: [],
};

export const operation: CreateWalletOperation = {
    name: 'CreateWallet',
    schemaVersion: 1,
    intent: {
        id: 'intent-1',
        key: [
            'wallet',
            'create',
            'v1',
            'tenantType=merchant&tenantId=merchant-1',
            'currency=EUR&userId=user-1',
        ].join(':'),
    },
    actor: {
        type: 'user',
        id: 'user-1',
        origin: {},
    },
    tenant: {
        type: 'merchant',
        id: merchantId,
    },
    subject: {
        type: 'user',
        id: 'user-1',
    },
    aggregate: {
        type: 'wallet',
        id: walletId,
    },
    payload: {
        currency: 'EUR',
    },
};

export const command: CreateWalletCommand = {
    operation,
    context: {
        correlationId: 'flow-1',
    },
};

export const claimedEntry: InProgressExecutionLogEntry<CreateWalletOperation> = {
    executionId,
    intentId: operation.intent.id,
    operation,
    attemptCount: 1,
    createdAt: '2026-07-18T10:00:00.000Z',
    latestAttempt: {
        attemptId,
        executionId,
        attemptNumber: 1,
        correlationId: command.context.correlationId,
        runnerId: leaseOwnerId,
        leaseVersion,
        startedAt: '2026-07-18T10:00:00.000Z',
        status: 'in-progress',
        failure: null,
        finishedAt: null,
    },
    lease: {
        ownerId: leaseOwnerId,
        version: leaseVersion,
        acquiredAt: '2026-07-18T10:00:00.000Z',
        expiresAt: '2026-07-18T10:01:00.000Z',
    },
    result: null,
    finishedAt: null,
};

type TransactionAction = () => void;

interface ActiveTransaction {
    readonly actions: TransactionAction[];
}

class TransactionCoordinator {
    private activeTransaction: ActiveTransaction | null = null;

    stage(action: TransactionAction): void {
        if (this.activeTransaction === null) {
            throw new Error('No test transaction is active.');
        }

        this.activeTransaction.actions.push(action);
    }

    async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<{
        readonly result: TResult;
        readonly outcome: ExecutionTransactionOutcome<TResult>['type'];
    }> {
        if (this.activeTransaction !== null) {
            throw new Error('Nested test transactions are not supported.');
        }

        const transaction: ActiveTransaction = {
            actions: [],
        };

        this.activeTransaction = transaction;

        try {
            const outcome = await work();

            if (outcome.type === 'commit') {
                for (const action of transaction.actions) {
                    action();
                }
            }

            return {
                result: outcome.result,
                outcome: outcome.type,
            };
        } finally {
            this.activeTransaction = null;
        }
    }
}

export class TestExecutionTransaction implements ExecutionTransaction {
    readonly outcomes: Array<'commit' | 'rollback' | 'throw'> = [];

    constructor(private readonly coordinator: TransactionCoordinator) {}

    async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult> {
        try {
            const execution = await this.coordinator.execute(work);

            this.outcomes.push(execution.outcome);

            return execution.result;
        } catch (error: unknown) {
            this.outcomes.push('throw');

            throw error;
        }
    }

    get commitCount(): number {
        return this.outcomes.filter((outcome) => outcome === 'commit').length;
    }

    get rollbackCount(): number {
        return this.outcomes.filter((outcome) => outcome === 'rollback' || outcome === 'throw')
            .length;
    }
}

export class FixedClock implements Clock {
    constructor(private readonly timestamp = '2026-07-18T10:00:00.000Z') {}

    now(): string {
        return this.timestamp;
    }
}

class TestExecutionIdFactory implements ExecutionIdFactory {
    readonly receivedIntentIds: string[] = [];

    create(intentId: string): ExecutionId {
        this.receivedIntentIds.push(intentId);

        return executionId;
    }
}

export class TestOperationHandler implements OperationHandler<CreateWalletOperation> {
    invocationCount = 0;

    result: CreateWalletResult = successResult;

    error: unknown = null;

    constructor(
        private readonly coordinator: TransactionCoordinator,
        readonly committedWallets: WalletId[],
    ) {}

    async execute(receivedOperation: CreateWalletOperation): Promise<CreateWalletResult> {
        this.invocationCount += 1;

        this.coordinator.stage(() => {
            this.committedWallets.push(receivedOperation.aggregate.id);
        });

        if (this.error !== null) {
            throw this.error;
        }

        return this.result;
    }
}

class TestOperationHandlerResolver implements OperationHandlerResolver {
    invocationCount = 0;

    constructor(private readonly handler: TestOperationHandler) {}

    resolve<TOperation extends AnyOperation>(_operation: TOperation): OperationHandler<TOperation> {
        this.invocationCount += 1;

        return this.handler as unknown as OperationHandler<TOperation>;
    }
}

export class TestExecutionLogStore implements ExecutionLogStore {
    claimResult: ClaimExecutionResult<CreateWalletOperation> = {
        type: 'claimed',
        entry: claimedEntry,
    };

    completeResult: CompleteExecutionResult<CreateWalletOperation> = {
        type: 'completed',
        entry: {} as never,
    };

    failResult: FailExecutionResult<CreateWalletOperation> = {
        type: 'failed',
        entry: {} as never,
    };

    readonly claimRequests: ClaimExecutionRequest<CreateWalletOperation>[] = [];

    /**
     * Every attempted complete transition, including rejected ones.
     */
    readonly completeAttempts: CompleteExecutionRequest<CreateWalletOperation>[] = [];

    /**
     * Only complete transitions committed successfully.
     */
    readonly completedRequests: CompleteExecutionRequest<CreateWalletOperation>[] = [];

    /**
     * Every attempted fail transition, including rejected ones.
     */
    readonly failAttempts: FailExecutionRequest[] = [];

    /**
     * Only fail transitions committed successfully.
     */
    readonly failedRequests: FailExecutionRequest[] = [];

    claimError: unknown = null;

    completeError: unknown = null;

    failError: unknown = null;

    constructor(private readonly coordinator: TransactionCoordinator) {}

    async claim<TOperation extends AnyOperation>(
        request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>> {
        this.claimRequests.push(request as ClaimExecutionRequest<CreateWalletOperation>);

        if (this.claimError !== null) {
            throw this.claimError;
        }

        return this.claimResult as ClaimExecutionResult<TOperation>;
    }

    async complete<TOperation extends AnyOperation>(
        request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>> {
        const typedRequest = request as CompleteExecutionRequest<CreateWalletOperation>;

        this.completeAttempts.push(typedRequest);

        if (this.completeError !== null) {
            throw this.completeError;
        }

        if (this.completeResult.type === 'completed') {
            this.coordinator.stage(() => {
                this.completedRequests.push(typedRequest);
            });
        }

        return this.completeResult as CompleteExecutionResult<TOperation>;
    }

    async fail<TOperation extends AnyOperation>(
        request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>> {
        this.failAttempts.push(request);

        if (this.failError !== null) {
            throw this.failError;
        }

        if (this.failResult.type === 'failed') {
            this.coordinator.stage(() => {
                this.failedRequests.push(request);
            });
        }

        return this.failResult as FailExecutionResult<TOperation>;
    }

    async findByIntentId(_intentId: string): Promise<AnyExecutionLogEntry | null> {
        return null;
    }
}

export class TestOutboxStore implements OutboxStore {
    readonly records: AnyOutboxRecord[] = [];

    error: unknown = null;

    constructor(private readonly coordinator: TransactionCoordinator) {}

    async append(records: readonly AnyOutboxRecord[]): Promise<void> {
        if (this.error !== null) {
            throw this.error;
        }

        this.coordinator.stage(() => {
            this.records.push(...records);
        });
    }
}

export interface RunnerTestKit {
    readonly runner: Runner;

    readonly executionIdFactory: TestExecutionIdFactory;

    readonly executionLogStore: TestExecutionLogStore;

    readonly executionTransaction: TestExecutionTransaction;

    readonly handler: TestOperationHandler;

    readonly handlerResolver: TestOperationHandlerResolver;

    readonly outboxStore: TestOutboxStore;

    readonly committedWallets: WalletId[];
}

export function createRunnerTestKit(): RunnerTestKit {
    const coordinator = new TransactionCoordinator();

    const committedWallets: WalletId[] = [];

    const executionIdFactory = new TestExecutionIdFactory();

    const executionLogStore = new TestExecutionLogStore(coordinator);

    const executionTransaction = new TestExecutionTransaction(coordinator);

    const handler = new TestOperationHandler(coordinator, committedWallets);

    const handlerResolver = new TestOperationHandlerResolver(handler);

    const outboxStore = new TestOutboxStore(coordinator);

    const clock = new FixedClock();

    const runner = createRunner({
        dependencies: {
            clock,
            executionIdFactory,
            executionLogStore,
            operationHandlerResolver: handlerResolver,
            executionTransaction,
            operationEventEnvelopeFactory: new DefaultOperationEventEnvelopeFactory(
                clock,
                new DefaultEventIdFactory(),
            ),
            outboxRecordFactory: new DefaultOutboxRecordFactory(clock),
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
        executionIdFactory,
        executionLogStore,
        executionTransaction,
        handler,
        handlerResolver,
        outboxStore,
        committedWallets,
    };
}

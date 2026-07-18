import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type {
    ExecutionAttemptId,
    ExecutionId,
    ExecutionLease,
    ExecutionLeaseOwnerId,
    ExecutionLeaseVersion,
} from '@event-driven-platform/execution';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import {
    type CompletedExecutionAttempt,
    type CompletedExecutionLogEntry,
    type ExecutionAttempt,
    type ExecutionLogEntry,
    type FailedExecutionAttempt,
    type FailedExecutionLogEntry,
    type InProgressExecutionAttempt,
    type InProgressExecutionLogEntry,
    isCompletedExecutionAttempt,
    isCompletedExecutionLogEntry,
    isFailedExecutionAttempt,
    isFailedExecutionLogEntry,
    isInProgressExecutionAttempt,
    isInProgressExecutionLogEntry,
    isTimedOutExecutionAttempt,
    type TimedOutExecutionAttempt,
} from '../index.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface CreateWalletData {
    readonly walletId: WalletId;
}

type CreateWalletResult = SuccessfulOperationResult<CreateWalletData>;

type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

const executionId = 'execution-1' as ExecutionId;

const attemptId = 'attempt-1' as ExecutionAttemptId;

const runnerId = 'runner-1' as ExecutionLeaseOwnerId;

const leaseVersion = 1 as ExecutionLeaseVersion;

const lease: ExecutionLease = {
    ownerId: runnerId,
    version: leaseVersion,
    acquiredAt: '2026-07-17T10:00:00.000Z',
    expiresAt: '2026-07-17T10:01:00.000Z',
};

const merchantId = 'merchant-1' as MerchantId;

const walletId = 'wallet-1' as WalletId;

const operation: CreateWalletOperation = {
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

describe('ExecutionLogEntry', () => {
    it('describes an in-progress execution through its latest attempt', () => {
        const latestAttempt: InProgressExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'in-progress',
            failure: null,
            finishedAt: null,
        };

        const entry: InProgressExecutionLogEntry<CreateWalletOperation> = {
            executionId,
            intentId: 'intent-1',
            operation,
            attemptCount: 1,
            createdAt: '2026-07-17T10:00:00.000Z',
            latestAttempt,
            lease,
            result: null,
            finishedAt: null,
        };

        expect(isInProgressExecutionLogEntry(entry)).toBe(true);

        expect(entry.latestAttempt.status).toBe('in-progress');

        expect(entry.latestAttempt.correlationId).toBe('flow-1');

        expect(entry.lease).toEqual(lease);

        expectTypeOf(entry.latestAttempt).toEqualTypeOf<InProgressExecutionAttempt>();

        expectTypeOf(entry.result).toEqualTypeOf<null>();
    });

    it('describes a completed execution through its latest attempt', () => {
        const latestAttempt: CompletedExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'completed',
            failure: null,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        const result: CreateWalletResult = {
            status: 'success',
            data: {
                walletId,
            },
            events: [],
        };

        const entry: CompletedExecutionLogEntry<CreateWalletOperation> = {
            executionId,
            intentId: 'intent-1',
            operation,
            attemptCount: 1,
            createdAt: '2026-07-17T10:00:00.000Z',
            latestAttempt,
            lease: null,
            result,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(isCompletedExecutionLogEntry(entry)).toBe(true);

        expect(entry.latestAttempt.status).toBe('completed');

        expect(entry.lease).toBeNull();

        expectTypeOf(entry.latestAttempt).toEqualTypeOf<CompletedExecutionAttempt>();

        expectTypeOf(entry.result).toEqualTypeOf<CreateWalletResult>();
    });

    it('describes a failed execution through its latest attempt', () => {
        const latestAttempt: FailedExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'failed',
            failure: {
                code: 'database-unavailable',
                message: 'Database is unavailable.',
                retryable: true,
            },
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        const entry: FailedExecutionLogEntry<CreateWalletOperation> = {
            executionId,
            intentId: 'intent-1',
            operation,
            attemptCount: 1,
            createdAt: '2026-07-17T10:00:00.000Z',
            latestAttempt,
            lease: null,
            result: null,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(isFailedExecutionLogEntry(entry)).toBe(true);

        expect(entry.latestAttempt.status).toBe('failed');

        expect(entry.latestAttempt.failure).toEqual({
            code: 'database-unavailable',
            message: 'Database is unavailable.',
            retryable: true,
        });

        expectTypeOf(entry.result).toEqualTypeOf<null>();
    });

    it('describes a timed-out execution as a failed log entry', () => {
        const latestAttempt: TimedOutExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'timed-out',
            failure: {
                code: 'execution-timeout',
                message: 'Execution timed out.',
                retryable: true,
            },
            finishedAt: '2026-07-17T10:00:30.000Z',
        };

        const entry: FailedExecutionLogEntry<CreateWalletOperation> = {
            executionId,
            intentId: 'intent-1',
            operation,
            attemptCount: 1,
            createdAt: '2026-07-17T10:00:00.000Z',
            latestAttempt,
            lease: null,
            result: null,
            finishedAt: '2026-07-17T10:00:30.000Z',
        };

        expect(isFailedExecutionLogEntry(entry)).toBe(true);

        expect(entry.latestAttempt.status).toBe('timed-out');
    });

    it('narrows an entry through its type guard', () => {
        const latestAttempt: InProgressExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'in-progress',
            failure: null,
            finishedAt: null,
        };

        const entry: ExecutionLogEntry<CreateWalletOperation> = {
            executionId,
            intentId: 'intent-1',
            operation,
            attemptCount: 1,
            createdAt: '2026-07-17T10:00:00.000Z',
            latestAttempt,
            lease,
            result: null,
            finishedAt: null,
        };

        if (isInProgressExecutionLogEntry(entry)) {
            expectTypeOf(entry).toEqualTypeOf<InProgressExecutionLogEntry<CreateWalletOperation>>();

            expectTypeOf(entry.latestAttempt).toEqualTypeOf<InProgressExecutionAttempt>();

            expectTypeOf(entry.lease).toEqualTypeOf<ExecutionLease>();
        }
    });
});

describe('ExecutionAttempt', () => {
    it('describes an in-progress attempt', () => {
        const attempt: InProgressExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'in-progress',
            failure: null,
            finishedAt: null,
        };

        expect(isInProgressExecutionAttempt(attempt)).toBe(true);
    });

    it('describes a completed attempt', () => {
        const attempt: CompletedExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'completed',
            failure: null,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(isCompletedExecutionAttempt(attempt)).toBe(true);
    });

    it('describes a failed attempt', () => {
        const attempt: FailedExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'failed',
            failure: {
                code: 'database-unavailable',
                message: 'Database is unavailable.',
                retryable: true,
            },
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(isFailedExecutionAttempt(attempt)).toBe(true);
    });

    it('describes a timed-out attempt', () => {
        const attempt: TimedOutExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'timed-out',
            failure: {
                code: 'execution-timeout',
                message: 'Execution timed out.',
                retryable: true,
            },
            finishedAt: '2026-07-17T10:00:30.000Z',
        };

        expect(isTimedOutExecutionAttempt(attempt)).toBe(true);
    });

    it('narrows the attempt union by status', () => {
        const attempt: ExecutionAttempt = {
            attemptId,
            executionId,
            attemptNumber: 1,
            correlationId: 'flow-1',
            runnerId,
            leaseVersion,
            startedAt: '2026-07-17T10:00:00.000Z',
            status: 'completed',
            failure: null,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        if (attempt.status === 'completed') {
            expectTypeOf(attempt).toEqualTypeOf<CompletedExecutionAttempt>();
        }
    });
});

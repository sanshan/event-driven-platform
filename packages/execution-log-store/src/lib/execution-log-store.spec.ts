import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
    ExecutionAttemptId,
    ExecutionId,
    ExecutionLease,
    ExecutionLeaseOwnerId,
    ExecutionLeaseVersion,
} from '@event-driven-platform/execution';
import type { AnyOperation, Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Brand } from '@event-driven-platform/types';

import type {
    ClaimExecutionRequest,
    ClaimExecutionResult,
    CompleteExecutionRequest,
    CompleteExecutionResult,
    ExecutionLeaseReference,
    ExecutionLogStore,
    FailExecutionRequest,
    FailExecutionResult,
} from '../index.js';

type WalletId = Brand<string, 'WalletId'>;

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
    WalletId,
    CreateWalletPayload,
    CreateWalletResult
>;

const executionId = 'execution-1' as ExecutionId;

const attemptId = 'attempt-1' as ExecutionAttemptId;

const runnerId = 'runner-1' as ExecutionLeaseOwnerId;

const leaseVersion = 1 as ExecutionLeaseVersion;

const operation: CreateWalletOperation = {
    name: 'CreateWallet',
    schemaVersion: 1,
    intent: {
        id: 'intent-1',
        key: 'wallet.create:v1:user-1:EUR',
    },
    actor: {
        type: 'user',
        id: 'user-1',
        origin: {},
    },
    subject: {
        type: 'user',
        id: 'user-1',
    },
    aggregateId: 'wallet-1' as WalletId,
    payload: {
        currency: 'EUR',
    },
};

const lease: ExecutionLease = {
    ownerId: runnerId,
    version: leaseVersion,
    acquiredAt: '2026-07-17T10:00:00.000Z',
    expiresAt: '2026-07-17T10:01:00.000Z',
};

const leaseReference: ExecutionLeaseReference = {
    ownerId: runnerId,
    version: leaseVersion,
};

class TestExecutionLogStore implements ExecutionLogStore {
    async claim<TOperation extends AnyOperation>(
        _request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>> {
        throw new Error('Not implemented.');
    }

    async complete<TOperation extends AnyOperation>(
        _request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>> {
        throw new Error('Not implemented.');
    }

    async fail<TOperation extends AnyOperation>(
        _request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>> {
        throw new Error('Not implemented.');
    }

    async findByIntentId(): Promise<null> {
        return null;
    }
}

describe('ExecutionLogStore', () => {
    it('describes an atomic claim request', () => {
        const request: ClaimExecutionRequest<CreateWalletOperation> = {
            executionId,
            attemptId,
            operation,
            correlationId: 'flow-1',
            lease,
            startedAt: '2026-07-17T10:00:00.000Z',
        };

        expect(request).toEqual({
            executionId: 'execution-1',
            attemptId: 'attempt-1',
            operation,
            correlationId: 'flow-1',
            lease,
            startedAt: '2026-07-17T10:00:00.000Z',
        });

        expectTypeOf(request.operation).toEqualTypeOf<CreateWalletOperation>();
    });

    it('describes a completion request', () => {
        const result: CreateWalletResult = {
            status: 'success',
            data: {
                walletId: 'wallet-1' as WalletId,
            },
            events: [],
        };

        const request: CompleteExecutionRequest<CreateWalletOperation> = {
            executionId,
            attemptId,
            lease: leaseReference,
            result,
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(request.result).toEqual(result);

        expectTypeOf(request.result).toEqualTypeOf<CreateWalletResult>();
    });

    it('describes an infrastructure failure request', () => {
        const request: FailExecutionRequest = {
            executionId,
            attemptId,
            lease: leaseReference,
            status: 'failed',
            failure: {
                code: 'database-unavailable',
                message: 'Database is unavailable.',
                retryable: true,
            },
            finishedAt: '2026-07-17T10:00:01.000Z',
        };

        expect(request.status).toBe('failed');
        expect(request.failure.retryable).toBe(true);
    });

    it('can be implemented without choosing a database', async () => {
        const store: ExecutionLogStore = new TestExecutionLogStore();

        await expect(store.findByIntentId('intent-1')).resolves.toBeNull();
    });
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CompletedExecutionLogEntry } from '@event-driven-platform/execution-log';
import type { ExecutionLeaseReference } from '@event-driven-platform/execution-log-store';

import { ExecutionClaimRejectedError, ExecutionTransitionRejectedError } from '../index.js';
import {
    claimedEntry,
    command,
    committedRejectionResult,
    createRunnerTestKit,
    type CreateWalletOperation,
    type CreateWalletResult,
    executionId,
    operation,
    rolledBackRejectionResult,
    successResult,
} from '../../test/runner-test-kit.js';

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
    try {
        await work();

        return null;
    } catch (error: unknown) {
        return error;
    }
}

function createCompletedEntry(): CompletedExecutionLogEntry<CreateWalletOperation> {
    return {
        executionId,
        intentId: operation.intent.id,
        operation,
        attemptCount: 1,
        createdAt: '2026-07-18T10:00:00.000Z',
        latestAttempt: {
            ...claimedEntry.latestAttempt,
            status: 'completed',
            failure: null,
            finishedAt: '2026-07-18T10:00:01.000Z',
        },
        lease: null,
        result: successResult,
        finishedAt: '2026-07-18T10:00:01.000Z',
    };
}

function expectTransitionRejectedError(
    error: unknown,
    expectedTransition: 'complete' | 'fail',
    expectedRejectionType: string,
): asserts error is ExecutionTransitionRejectedError {
    expect(error).toBeInstanceOf(ExecutionTransitionRejectedError);

    if (!(error instanceof ExecutionTransitionRejectedError)) {
        throw new Error('Expected ExecutionTransitionRejectedError.');
    }

    expect(error.transition).toBe(expectedTransition);

    expect(error.rejection.type).toBe(expectedRejectionType);
}

describe('DefaultRunner', () => {
    it('returns a stored result without executing the Handler', async () => {
        const kit = createRunnerTestKit();

        kit.executionLogStore.claimResult = {
            type: 'completed',
            entry: createCompletedEntry(),
        };

        const execution = await kit.runner.executeDetailed(command);

        expect(execution).toEqual({
            executionId,
            resultSource: 'stored',
            result: successResult,
        });

        expect(kit.handler.invocationCount).toBe(0);

        expect(kit.handlerResolver.invocationCount).toBe(0);

        expect(kit.executionTransaction.outcomes).toEqual([]);

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toEqual([]);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failAttempts).toEqual([]);

        expect(kit.executionLogStore.failedRequests).toEqual([]);
    });

    it('throws when another Runner owns the active execution', async () => {
        const kit = createRunnerTestKit();

        kit.executionLogStore.claimResult = {
            type: 'already-in-progress',
            entry: claimedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBeInstanceOf(ExecutionClaimRejectedError);
        expect((error as ExecutionClaimRejectedError).reason).toBe('already-in-progress');

        expect(kit.handler.invocationCount).toBe(0);

        expect(kit.handlerResolver.invocationCount).toBe(0);

        expect(kit.executionTransaction.outcomes).toEqual([]);
    });

    it('throws when the Intent conflicts with the persisted Operation', async () => {
        const kit = createRunnerTestKit();

        kit.executionLogStore.claimResult = {
            type: 'intent-conflict',
            entry: claimedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBeInstanceOf(ExecutionClaimRejectedError);
        expect((error as ExecutionClaimRejectedError).reason).toBe('intent-conflict');

        expect(kit.handler.invocationCount).toBe(0);

        expect(kit.handlerResolver.invocationCount).toBe(0);

        expect(kit.executionTransaction.outcomes).toEqual([]);
    });

    it('commits domain changes, completion and Outbox atomically for success', async () => {
        const kit = createRunnerTestKit();

        kit.handler.result = successResult;

        const execution = await kit.runner.executeDetailed(command);

        expect(execution).toEqual({
            executionId,
            resultSource: 'executed',
            result: successResult,
        });

        expect(kit.committedWallets).toEqual([operation.aggregate.id]);

        expect(kit.executionLogStore.completedRequests).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests[0]?.result).toBe(successResult);

        expect(kit.outboxStore.records).toHaveLength(1);

        expect(kit.outboxStore.records[0]?.envelope.eventName).toBe('wallet.created');

        expect(kit.executionTransaction.outcomes).toEqual(['commit']);

        expect(kit.executionLogStore.failAttempts).toEqual([]);

        expect(kit.executionLogStore.failedRequests).toEqual([]);
    });

    it('uses the same commit path for a committed business rejection', async () => {
        const kit = createRunnerTestKit();

        kit.handler.result = committedRejectionResult;

        const result = await kit.runner.execute(command);

        expect(result).toBe(committedRejectionResult);

        expect(kit.committedWallets).toEqual([operation.aggregate.id]);

        expect(kit.executionLogStore.completedRequests).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests[0]?.result).toBe(committedRejectionResult);

        expect(kit.outboxStore.records).toHaveLength(1);

        expect(kit.executionTransaction.outcomes).toEqual(['commit']);

        expect(kit.executionLogStore.failAttempts).toEqual([]);
    });

    it('rolls back Handler changes and persists a rolled-back rejection separately', async () => {
        const kit = createRunnerTestKit();

        kit.handler.result = rolledBackRejectionResult;

        const execution = await kit.runner.executeDetailed(command);

        expect(execution).toEqual({
            executionId,
            resultSource: 'executed',
            result: rolledBackRejectionResult,
        });

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completedRequests).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests[0]?.result).toBe(rolledBackRejectionResult);

        expect(kit.executionTransaction.outcomes).toEqual(['rollback', 'commit']);

        expect(kit.executionLogStore.failAttempts).toEqual([]);
    });

    it('rolls back and records an infrastructure failure when the Handler throws', async () => {
        const kit = createRunnerTestKit();

        const handlerError = new Error('Unexpected persistence failure.');

        kit.handler.error = handlerError;

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBe(handlerError);

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failedRequests).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests[0]?.failure).toEqual({
            code: 'unexpected-execution-error',
            message: 'Unexpected persistence failure.',
            retryable: false,
        });

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'commit']);
    });

    it('rolls back domain changes and completion when Outbox persistence fails', async () => {
        const kit = createRunnerTestKit();

        const outboxError = new Error('Outbox persistence failed.');

        kit.outboxStore.error = outboxError;

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBe(outboxError);

        expect(kit.committedWallets).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.failedRequests).toHaveLength(1);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'commit']);
    });

    it('does not replace the original Handler error when failure persistence throws', async () => {
        const kit = createRunnerTestKit();

        const handlerError = new Error('Handler failed.');

        const failurePersistenceError = new Error('Failure persistence failed.');

        kit.handler.error = handlerError;

        kit.executionLogStore.failError = failurePersistenceError;

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBe(handlerError);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'throw']);
    });

    it('returns only the business result through execute()', async () => {
        const kit = createRunnerTestKit();

        const result = await kit.runner.execute(command);

        expect(result).toBe(successResult);

        expectTypeOf(result).toEqualTypeOf<CreateWalletResult>();
    });

    it('claims execution with deterministic identity, runtime and Command context', async () => {
        const kit = createRunnerTestKit();

        await kit.runner.execute(command);

        expect(kit.executionIdFactory.receivedIntentIds).toEqual([operation.intent.id]);

        expect(kit.executionLogStore.claimRequests).toEqual([
            {
                executionId,
                operation,
                correlationId: command.context.correlationId,
                leaseOwnerId: claimedEntry.lease.ownerId,
                leaseDurationMs: 60_000,
                requestedAt: '2026-07-18T10:00:00.000Z',
            },
        ]);
    });

    it('completes the exact claimed attempt and lease', async () => {
        const kit = createRunnerTestKit();

        await kit.runner.execute(command);

        const expectedLease: ExecutionLeaseReference = {
            ownerId: claimedEntry.lease.ownerId,
            version: claimedEntry.lease.version,
        };

        expect(kit.executionLogStore.completeAttempts).toEqual([
            {
                executionId,
                attemptId: claimedEntry.latestAttempt.attemptId,
                lease: expectedLease,
                result: successResult,
                finishedAt: '2026-07-18T10:00:00.000Z',
            },
        ]);

        expect(kit.executionLogStore.completedRequests).toEqual(
            kit.executionLogStore.completeAttempts,
        );
    });

    it('fails the exact claimed attempt and lease after an infrastructure error', async () => {
        const kit = createRunnerTestKit();

        const handlerError = new Error('Persistence failed.');

        kit.handler.error = handlerError;

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBe(handlerError);

        expect(kit.executionLogStore.failAttempts).toEqual([
            {
                executionId,
                attemptId: claimedEntry.latestAttempt.attemptId,
                lease: {
                    ownerId: claimedEntry.lease.ownerId,
                    version: claimedEntry.lease.version,
                },
                status: 'failed',
                failure: {
                    code: 'unexpected-execution-error',
                    message: 'Persistence failed.',
                    retryable: false,
                },
                finishedAt: '2026-07-18T10:00:00.000Z',
            },
        ]);

        expect(kit.executionLogStore.failedRequests).toEqual(kit.executionLogStore.failAttempts);
    });

    it('rolls back domain changes and Outbox when completion loses the lease', async () => {
        const kit = createRunnerTestKit();

        kit.executionLogStore.completeResult = {
            type: 'lease-conflict',
            entry: claimedEntry,
        };

        kit.executionLogStore.failResult = {
            type: 'lease-conflict',
            entry: claimedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expectTransitionRejectedError(error, 'complete', 'lease-conflict');

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'throw']);
    });

    it('rolls back execution when completion cannot find the Execution', async () => {
        const kit = createRunnerTestKit();

        kit.executionLogStore.completeResult = {
            type: 'not-found',
        };

        kit.executionLogStore.failResult = {
            type: 'not-found',
        };

        const error = await captureError(() => kit.runner.execute(command));

        expectTransitionRejectedError(error, 'complete', 'not-found');

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'throw']);
    });

    it('rolls back execution when completion finds a non-active Execution', async () => {
        const kit = createRunnerTestKit();

        const completedEntry = createCompletedEntry();

        kit.executionLogStore.completeResult = {
            type: 'not-in-progress',
            entry: completedEntry,
        };

        kit.executionLogStore.failResult = {
            type: 'not-in-progress',
            entry: completedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expectTransitionRejectedError(error, 'complete', 'not-in-progress');

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'throw']);
    });

    it('keeps Handler changes rolled back when rolled-back rejection completion is rejected', async () => {
        const kit = createRunnerTestKit();

        kit.handler.result = rolledBackRejectionResult;

        kit.executionLogStore.completeResult = {
            type: 'lease-conflict',
            entry: claimedEntry,
        };

        kit.executionLogStore.failResult = {
            type: 'lease-conflict',
            entry: claimedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expectTransitionRejectedError(error, 'complete', 'lease-conflict');

        expect(kit.committedWallets).toEqual([]);
        expect(kit.outboxStore.records).toEqual([]);

        expect(kit.executionLogStore.completeAttempts).toHaveLength(1);

        expect(kit.executionLogStore.completedRequests).toEqual([]);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['rollback', 'throw', 'throw']);
    });

    it('preserves the original Handler error when failure transition loses the lease', async () => {
        const kit = createRunnerTestKit();

        const handlerError = new Error('Handler persistence failed.');

        kit.handler.error = handlerError;

        kit.executionLogStore.failResult = {
            type: 'lease-conflict',
            entry: claimedEntry,
        };

        const error = await captureError(() => kit.runner.execute(command));

        expect(error).toBe(handlerError);

        expect(kit.executionLogStore.failAttempts).toHaveLength(1);

        expect(kit.executionLogStore.failedRequests).toEqual([]);

        expect(kit.executionTransaction.outcomes).toEqual(['throw', 'throw']);
    });
});

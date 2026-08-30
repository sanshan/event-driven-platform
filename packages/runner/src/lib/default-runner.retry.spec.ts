import { describe, expect, it } from 'vitest';

import type { ExecutionAttemptId, ExecutionLeaseVersion } from '@event-driven-platform/execution';
import type { InProgressExecutionLogEntry } from '@event-driven-platform/execution-log';
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
    type ExecutionTimeout,
    type ExecutionTimeoutResult,
    type GuardEvaluator,
    type RateLimiter,
    type RetryDelay,
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

function claimedAttempt(number: number): InProgressExecutionLogEntry<CreateWalletOperation> {
    return {
        ...claimedEntry,
        attemptCount: number,
        latestAttempt: {
            ...claimedEntry.latestAttempt,
            attemptId: `attempt-${number}` as ExecutionAttemptId,
            attemptNumber: number,
            leaseVersion: number as ExecutionLeaseVersion,
        },
        lease: {
            ...claimedEntry.lease,
            version: number as ExecutionLeaseVersion,
        },
    };
}

class RetryExecutionLogStore implements ExecutionLogStore {
    readonly claimRequests: ClaimExecutionRequest<CreateWalletOperation>[] = [];
    readonly failRequests: FailExecutionRequest[] = [];
    readonly completeRequests: CompleteExecutionRequest<CreateWalletOperation>[] = [];

    claimResults: ClaimExecutionResult<CreateWalletOperation>[] = [];
    rejectFailureTransition = false;

    async claim<TOperation extends AnyOperation>(
        request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>> {
        this.claimRequests.push(request as ClaimExecutionRequest<CreateWalletOperation>);

        const result = this.claimResults.shift();

        if (result === undefined) {
            throw new Error('No claim result configured.');
        }

        return result as ClaimExecutionResult<TOperation>;
    }

    async complete<TOperation extends AnyOperation>(
        request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>> {
        this.completeRequests.push(request as CompleteExecutionRequest<CreateWalletOperation>);

        return {
            type: 'completed',
            entry: {} as never,
        };
    }

    async fail<TOperation extends AnyOperation>(
        request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>> {
        this.failRequests.push(request);

        if (this.rejectFailureTransition) {
            return {
                type: 'lease-conflict',
                entry: claimedAttempt(1),
            } as FailExecutionResult<TOperation>;
        }

        return {
            type: 'failed',
            entry: {} as never,
        };
    }

    async findByIntentId(): Promise<null> {
        return null;
    }
}

interface HandlerOutcomeResult {
    readonly type: 'result';
}

interface HandlerOutcomeError {
    readonly type: 'error';
    readonly error: unknown;
}

type HandlerOutcome = HandlerOutcomeResult | HandlerOutcomeError;

class SequencedHandler implements OperationHandler<CreateWalletOperation> {
    invocationCount = 0;
    outcomes: HandlerOutcome[] = [];

    async execute() {
        this.invocationCount += 1;

        const outcome = this.outcomes.shift() ?? { type: 'result' as const };

        if (outcome.type === 'error') {
            throw outcome.error;
        }

        return successResult;
    }
}

class RecordingRetryDelay implements RetryDelay {
    readonly delays: number[] = [];

    async wait(delayMs: number): Promise<void> {
        this.delays.push(delayMs);
    }
}

function retryableError(code = 'provider-unavailable') {
    return {
        executionFailure: {
            code,
            message: 'Provider unavailable.',
            classification: 'unavailable',
            retry: 'current-execution',
            retryable: true,
        },
    };
}

function nonRetryableError() {
    return {
        executionFailure: {
            code: 'invalid-provider-response',
            message: 'Provider response is invalid.',
            classification: 'internal',
            retry: 'never',
            retryable: false,
        },
    };
}

interface RetryTestKit {
    readonly runner: ReturnType<typeof createRunner>;
    readonly store: RetryExecutionLogStore;
    readonly handler: SequencedHandler;
    readonly retryDelay: RecordingRetryDelay;
    readonly guardCalls: { count: number };
    readonly rateLimitCalls: { count: number };
}

function createRetryTestKit(options?: {
    readonly executionTimeout?: ExecutionTimeout;
    readonly guardEvaluator?: GuardEvaluator;
    readonly rateLimiter?: RateLimiter;
}): RetryTestKit {
    const store = new RetryExecutionLogStore();
    const handler = new SequencedHandler();
    const retryDelay = new RecordingRetryDelay();
    const guardCalls = { count: 0 };
    const rateLimitCalls = { count: 0 };

    const executionTransaction: ExecutionTransaction = {
        async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult> {
            const outcome = await work();
            return outcome.result;
        },
    };

    const operationHandlerResolver: OperationHandlerResolver = {
        resolve<TOperation extends AnyOperation>(): OperationHandler<TOperation> {
            return handler as unknown as OperationHandler<TOperation>;
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
            return;
        },
    };

    const guardEvaluator: GuardEvaluator =
        options?.guardEvaluator ??
        {
            async evaluate(): Promise<boolean> {
                guardCalls.count += 1;
                return true;
            },
        };

    const rateLimiter: RateLimiter =
        options?.rateLimiter ??
        {
            async consume() {
                rateLimitCalls.count += 1;
                return { type: 'allowed' as const };
            },
        };

    const runner = createRunner({
        dependencies: {
            clock: {
                now: () => '2026-08-20T10:00:00.000Z',
            },
            executionIdFactory: {
                create: () => executionId,
            },
            executionLogStore: store,
            executionTimeout: options?.executionTimeout,
            guardEvaluator,
            rateLimiter,
            retryDelay,
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
        store,
        handler,
        retryDelay,
        guardCalls,
        rateLimitCalls,
    };
}

function retryCommand(maxAttempts: number): CreateWalletCommand {
    return {
        ...command,
        options: {
            retry: {
                maxAttempts,
            },
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

describe('DefaultRunner retry orchestration', () => {
    it('claims a new persisted attempt and succeeds after a retryable failure', async () => {
        const kit = createRetryTestKit();
        const firstError = retryableError();

        kit.store.claimResults = [
            { type: 'claimed', entry: claimedAttempt(1) },
            { type: 'claimed', entry: claimedAttempt(2) },
        ];
        kit.handler.outcomes = [{ type: 'error', error: firstError }, { type: 'result' }];

        const result = await kit.runner.execute(retryCommand(2));

        expect(result).toBe(successResult);
        expect(kit.handler.invocationCount).toBe(2);
        expect(kit.store.claimRequests).toHaveLength(2);
        expect(kit.store.claimRequests[1]?.executionId).toBe(executionId);
        expect(kit.store.failRequests).toHaveLength(1);
        expect(kit.store.failRequests[0]?.attemptId).toBe('attempt-1');
        expect(kit.store.completeRequests[0]?.attemptId).toBe('attempt-2');
    });

    it('stops when the invocation maxAttempts budget is exhausted', async () => {
        const kit = createRetryTestKit();
        const firstError = retryableError('first');
        const secondError = retryableError('second');

        kit.store.claimResults = [
            { type: 'claimed', entry: claimedAttempt(1) },
            { type: 'claimed', entry: claimedAttempt(2) },
        ];
        kit.handler.outcomes = [
            { type: 'error', error: firstError },
            { type: 'error', error: secondError },
        ];

        const error = await captureError(() => kit.runner.execute(retryCommand(2)));

        expect(error).toBe(secondError);
        expect(kit.handler.invocationCount).toBe(2);
        expect(kit.store.claimRequests).toHaveLength(2);
        expect(kit.store.failRequests).toHaveLength(2);
    });

    it('does not retry non-retryable failures', async () => {
        const kit = createRetryTestKit();
        const errorValue = nonRetryableError();

        kit.store.claimResults = [{ type: 'claimed', entry: claimedAttempt(1) }];
        kit.handler.outcomes = [{ type: 'error', error: errorValue }];

        const error = await captureError(() => kit.runner.execute(retryCommand(3)));

        expect(error).toBe(errorValue);
        expect(kit.handler.invocationCount).toBe(1);
        expect(kit.store.claimRequests).toHaveLength(1);
    });

    it('does not retry when the failed attempt could not be persisted', async () => {
        const kit = createRetryTestKit();
        const errorValue = retryableError();

        kit.store.claimResults = [{ type: 'claimed', entry: claimedAttempt(1) }];
        kit.store.rejectFailureTransition = true;
        kit.handler.outcomes = [{ type: 'error', error: errorValue }];

        const error = await captureError(() => kit.runner.execute(retryCommand(3)));

        expect(error).toBe(errorValue);
        expect(kit.store.claimRequests).toHaveLength(1);
        expect(kit.handler.invocationCount).toBe(1);
    });

    it('uses the configured fixed delay before the next claim', async () => {
        const kit = createRetryTestKit();

        kit.store.claimResults = [
            { type: 'claimed', entry: claimedAttempt(1) },
            { type: 'claimed', entry: claimedAttempt(2) },
        ];
        kit.handler.outcomes = [{ type: 'error', error: retryableError() }, { type: 'result' }];

        await kit.runner.execute({
            ...command,
            options: {
                retry: {
                    maxAttempts: 2,
                    strategy: {
                        type: 'fixed',
                        delayMs: 125,
                    },
                },
            },
        });

        expect(kit.retryDelay.delays).toEqual([125]);
    });

    it('does not re-evaluate guards or rate limiting for internal retries', async () => {
        const kit = createRetryTestKit();

        kit.store.claimResults = [
            { type: 'claimed', entry: claimedAttempt(1) },
            { type: 'claimed', entry: claimedAttempt(2) },
        ];
        kit.handler.outcomes = [{ type: 'error', error: retryableError() }, { type: 'result' }];

        await kit.runner.execute({
            ...command,
            options: {
                guards: [{ name: 'wallet-enabled' }],
                rateLimit: {
                    key: 'wallet-create',
                    scope: 'actor',
                    limit: 10,
                    windowMs: 60_000,
                },
                retry: {
                    maxAttempts: 2,
                },
            },
        });

        expect(kit.guardCalls.count).toBe(1);
        expect(kit.rateLimitCalls.count).toBe(1);
        expect(kit.handler.invocationCount).toBe(2);
    });

    it('retries a timed-out handler attempt and records the first attempt as timed-out', async () => {
        let timeoutInvocation = 0;
        const executionTimeout: ExecutionTimeout = {
            async execute<TResult>(
                work: () => Promise<TResult>,
            ): Promise<ExecutionTimeoutResult<TResult>> {
                timeoutInvocation += 1;

                if (timeoutInvocation === 1) {
                    return { type: 'timed-out' };
                }

                return {
                    type: 'completed',
                    result: await work(),
                };
            },
        };
        const kit = createRetryTestKit({ executionTimeout });

        kit.store.claimResults = [
            { type: 'claimed', entry: claimedAttempt(1) },
            { type: 'claimed', entry: claimedAttempt(2) },
        ];

        const result = await kit.runner.execute({
            ...command,
            options: {
                timeoutMs: 100,
                retry: {
                    maxAttempts: 2,
                },
            },
        });

        expect(result).toBe(successResult);
        expect(kit.store.failRequests[0]?.status).toBe('timed-out');
        expect(kit.store.failRequests[0]?.failure.retryable).toBe(true);
        expect(kit.store.completeRequests[0]?.attemptId).toBe('attempt-2');
    });
});

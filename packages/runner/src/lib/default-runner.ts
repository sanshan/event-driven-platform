import type { Command } from '@event-driven-platform/command';
import type { InProgressExecutionLogEntry } from '@event-driven-platform/execution-log';
import type {
    CompleteExecutionResult,
    ExecutionLeaseReference,
    FailExecutionResult,
} from '@event-driven-platform/execution-log-store';
import { ExecutionTransactionOutcomes } from '@event-driven-platform/execution-transaction';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';
import { isRolledBackOperationRejection } from '@event-driven-platform/operation-result';

import { buildRateLimitBucketKey } from './build-rate-limit-bucket-key.js';
import { DefaultExecutionTimeout } from './default-execution-timeout.js';
import { ExecutionAlreadyInProgressError } from './execution-already-in-progress.error.js';
import { ExecutionGuardRejectedError } from './execution-guard-rejected.error.js';
import { ExecutionIntentConflictError } from './execution-intent-conflict.error.js';
import { ExecutionRateLimitRejectedError } from './execution-rate-limit-rejected.error.js';
import { ExecutionTimedOutError } from './execution-timed-out.error.js';
import type { ExecutionTimeout } from './execution-timeout.js';
import { ExecutionTransitionRejectedError } from './execution-transition-rejected.error.js';
import { GuardEvaluatorUnavailableError } from './guard-evaluator-unavailable.error.js';
import { normalizeExecutionFailure } from './normalize-execution-failure.js';
import { RateLimiterUnavailableError } from './rate-limiter-unavailable.error.js';
import type { RunnerDependencies } from './runner-dependencies.js';
import type { RunnerExecution } from './runner-execution.js';
import type { RunnerOptions } from './runner-options.js';
import type { RunnerRuntime } from './runner-runtime.js';
import type { Runner } from './runner.js';

export class DefaultRunner implements Runner {
    private readonly executionTimeout: ExecutionTimeout;

    constructor(
        private readonly dependencies: RunnerDependencies,
        private readonly runtime: RunnerRuntime,
        private readonly options: RunnerOptions,
    ) {
        this.executionTimeout = dependencies.executionTimeout ?? new DefaultExecutionTimeout();
    }

    async execute<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<OperationResultOf<TOperation>> {
        const execution = await this.executeDetailed(command);

        return execution.result;
    }

    async executeDetailed<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<RunnerExecution<TOperation>> {
        const executionId = this.dependencies.executionIdFactory.create(
            command.operation.intent.id,
        );

        const claim = await this.dependencies.executionLogStore.claim({
            executionId,
            operation: command.operation,
            correlationId: command.context.correlationId,
            leaseOwnerId: this.runtime.leaseOwnerId,
            leaseDurationMs: this.options.leaseDurationMs,
            requestedAt: this.dependencies.clock.now(),
        });

        switch (claim.type) {
            case 'completed':
                return {
                    executionId: claim.entry.executionId,
                    resultSource: 'stored',
                    result: claim.entry.result,
                };

            case 'already-in-progress':
                throw new ExecutionAlreadyInProgressError(claim.entry.executionId);

            case 'intent-conflict':
                throw new ExecutionIntentConflictError(claim.entry.executionId);

            case 'claimed':
                return this.executeClaimed(command, claim.entry);
        }
    }

    private async executeClaimed<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        entry: InProgressExecutionLogEntry<TOperation>,
    ): Promise<RunnerExecution<TOperation>> {
        const leaseReference: ExecutionLeaseReference = {
            ownerId: entry.lease.ownerId,
            version: entry.lease.version,
        };

        try {
            await this.evaluateGuards(command);
            await this.enforceRateLimit(command);

            const handler = this.dependencies.operationHandlerResolver.resolve(command.operation);

            const result = await this.dependencies.executionTransaction.execute(async () => {
                const timeoutMs = command.options?.timeoutMs;
                let operationResult: OperationResultOf<TOperation>;

                if (timeoutMs === undefined) {
                    operationResult = await handler.execute(command.operation);
                } else {
                    const timedExecution = await this.executionTimeout.execute(
                        () => handler.execute(command.operation),
                        timeoutMs,
                    );

                    if (timedExecution.type === 'timed-out') {
                        throw new ExecutionTimedOutError(timeoutMs);
                    }

                    operationResult = timedExecution.result;
                }

                if (isRolledBackOperationRejection(operationResult)) {
                    return ExecutionTransactionOutcomes.rollback(operationResult);
                }

                const envelopes = this.dependencies.operationEventEnvelopeFactory.createMany({
                    operation: command.operation,
                    context: command.context,
                    events: operationResult.events,
                });

                const records = this.dependencies.outboxRecordFactory.createMany(envelopes);

                const completion = await this.dependencies.executionLogStore.complete<TOperation>({
                    executionId: entry.executionId,
                    attemptId: entry.latestAttempt.attemptId,
                    lease: leaseReference,
                    result: operationResult,
                    finishedAt: this.dependencies.clock.now(),
                });

                this.assertCompleted(entry.executionId, completion);

                await this.dependencies.outboxStore.append(records);

                return ExecutionTransactionOutcomes.commit(operationResult);
            });

            if (isRolledBackOperationRejection(result)) {
                await this.completeRolledBackResult(entry, leaseReference, result);
            }

            return {
                executionId: entry.executionId,
                resultSource: 'executed',
                result,
            };
        } catch (error: unknown) {
            await this.recordExecutionFailure(
                entry,
                leaseReference,
                error,
                error instanceof ExecutionTimedOutError ? 'timed-out' : 'failed',
            );

            throw error;
        }
    }

    private async evaluateGuards<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<void> {
        const guards = command.options?.guards;

        if (guards === undefined || guards.length === 0) {
            return;
        }

        const evaluator = this.dependencies.guardEvaluator;

        if (evaluator === undefined) {
            throw new GuardEvaluatorUnavailableError();
        }

        for (const guard of guards) {
            const accepted = await evaluator.evaluate({
                guard,
                operation: command.operation,
            });

            if (!accepted) {
                throw new ExecutionGuardRejectedError(guard);
            }
        }
    }

    private async enforceRateLimit<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<void> {
        const rateLimit = command.options?.rateLimit;

        if (rateLimit === undefined) {
            return;
        }

        const limiter = this.dependencies.rateLimiter;

        if (limiter === undefined) {
            throw new RateLimiterUnavailableError();
        }

        const decision = await limiter.consume({
            bucketKey: buildRateLimitBucketKey(rateLimit, command.operation),
            limit: rateLimit.limit,
            windowMs: rateLimit.windowMs,
            cost: rateLimit.cost ?? 1,
        });

        if (decision.type === 'rejected') {
            throw new ExecutionRateLimitRejectedError(rateLimit);
        }
    }

    private async completeRolledBackResult<TOperation extends AnyOperation>(
        entry: InProgressExecutionLogEntry<TOperation>,
        lease: ExecutionLeaseReference,
        result: OperationResultOf<TOperation>,
    ): Promise<void> {
        await this.dependencies.executionTransaction.execute(async () => {
            const completion = await this.dependencies.executionLogStore.complete<TOperation>({
                executionId: entry.executionId,
                attemptId: entry.latestAttempt.attemptId,
                lease,
                result,
                finishedAt: this.dependencies.clock.now(),
            });

            this.assertCompleted(entry.executionId, completion);

            return ExecutionTransactionOutcomes.commit(undefined);
        });
    }

    private async recordExecutionFailure<TOperation extends AnyOperation>(
        entry: InProgressExecutionLogEntry<TOperation>,
        lease: ExecutionLeaseReference,
        error: unknown,
        status: 'failed' | 'timed-out',
    ): Promise<void> {
        try {
            await this.dependencies.executionTransaction.execute(async () => {
                const failureResult = await this.dependencies.executionLogStore.fail<TOperation>({
                    executionId: entry.executionId,
                    attemptId: entry.latestAttempt.attemptId,
                    lease,
                    status,
                    failure: normalizeExecutionFailure(error),
                    finishedAt: this.dependencies.clock.now(),
                });

                this.assertFailed(entry.executionId, failureResult);

                return ExecutionTransactionOutcomes.commit(undefined);
            });
        } catch {
            /*
             * Failure recording must not replace the original
             * execution error.
             *
             * The active lease will eventually expire and allow
             * another Runner to reclaim the execution.
             */
        }
    }

    private assertCompleted<TOperation extends AnyOperation>(
        executionId: InProgressExecutionLogEntry<TOperation>['executionId'],
        result: CompleteExecutionResult<TOperation>,
    ): void {
        if (result.type === 'completed') {
            return;
        }

        throw new ExecutionTransitionRejectedError(executionId, 'complete', result);
    }

    private assertFailed<TOperation extends AnyOperation>(
        executionId: InProgressExecutionLogEntry<TOperation>['executionId'],
        result: FailExecutionResult<TOperation>,
    ): void {
        if (result.type === 'failed') {
            return;
        }

        throw new ExecutionTransitionRejectedError(executionId, 'fail', result);
    }
}

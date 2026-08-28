import type { Command } from '@event-driven-platform/command';
import type { InProgressExecutionLogEntry } from '@event-driven-platform/execution-log';
import type {
    CompleteExecutionResult,
    ExecutionLeaseReference,
    FailExecutionResult,
} from '@event-driven-platform/execution-log-store';
import { ExecutionTransactionOutcomes } from '@event-driven-platform/execution-transaction';
import {
    NoopObserver,
    SafeObserver,
    type RunnerObservationContext,
    type RunnerObserver,
} from '@event-driven-platform/observability';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';
import {
    isOperationRejection,
    isRolledBackOperationRejection,
} from '@event-driven-platform/operation-result';

import type { HandlerAttemptOutcome } from '../attempt/handler-attempt-outcome.js';
import type { ResolvedOperationHandler } from '../attempt/resolved-operation-handler.js';
import { normalizeExecutionFailure } from '../failure/normalize-execution-failure.js';
import { ExecutionGuardRejectedError } from '../guard/execution-guard-rejected.error.js';
import { GuardEvaluatorUnavailableError } from '../guard/guard-evaluator-unavailable.error.js';
import { buildRateLimitBucketKey } from '../rate-limit/build-rate-limit-bucket-key.js';
import { ExecutionRateLimitRejectedError } from '../rate-limit/execution-rate-limit-rejected.error.js';
import { RateLimiterUnavailableError } from '../rate-limit/rate-limiter-unavailable.error.js';
import { calculateRetryDelay } from '../retry/calculate-retry-delay.js';
import { DefaultRetryDelay } from '../retry/default-retry-delay.js';
import type { RetryDelay } from '../retry/retry-delay.js';
import { DefaultExecutionTimeout } from '../timeout/default-execution-timeout.js';
import { ExecutionTimedOutError } from '../timeout/execution-timed-out.error.js';
import type { ExecutionTimeout } from '../timeout/execution-timeout.js';
import { ExecutionAlreadyInProgressError } from '../transition/execution-already-in-progress.error.js';
import { ExecutionIntentConflictError } from '../transition/execution-intent-conflict.error.js';
import { ExecutionTransitionRejectedError } from '../transition/execution-transition-rejected.error.js';
import type { RunnerDependencies } from './runner-dependencies.js';
import type { RunnerExecution } from './runner-execution.js';
import type { RunnerOptions } from './runner-options.js';
import type { RunnerRuntime } from './runner-runtime.js';
import type { Runner } from './runner.js';

export class DefaultRunner implements Runner {
    private readonly executionTimeout: ExecutionTimeout;

    private readonly observer: RunnerObserver;

    private readonly retryDelay: RetryDelay;

    constructor(
        private readonly dependencies: RunnerDependencies,
        private readonly runtime: RunnerRuntime,
        private readonly options: RunnerOptions,
    ) {
        this.executionTimeout = dependencies.executionTimeout ?? new DefaultExecutionTimeout();
        this.observer = new SafeObserver(dependencies.observer ?? new NoopObserver());
        this.retryDelay = dependencies.retryDelay ?? new DefaultRetryDelay();
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
        const context = this.createObservationContext(command);

        this.observer.observe({ type: 'execution.requested', context });

        const executionId = this.dependencies.executionIdFactory.create(
            command.operation.intent.id,
        );

        const claim = await this.claimExecution(command, executionId);

        switch (claim.type) {
            case 'completed':
                this.observer.observe({ type: 'idempotency.hit', context });

                return {
                    executionId: claim.entry.executionId,
                    resultSource: 'stored',
                    result: claim.entry.result,
                };

            case 'already-in-progress':
                this.observer.observe({
                    type: 'claim.rejected',
                    context,
                    reason: 'already-in-progress',
                });
                throw new ExecutionAlreadyInProgressError(claim.entry.executionId);

            case 'intent-conflict':
                this.observer.observe({
                    type: 'claim.rejected',
                    context,
                    reason: 'intent-conflict',
                });
                throw new ExecutionIntentConflictError(claim.entry.executionId);

            case 'claimed':
                return this.executeObservedClaimed(command, claim.entry, context);
        }
    }

    private async executeObservedClaimed<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        entry: InProgressExecutionLogEntry<TOperation>,
        context: RunnerObservationContext,
    ): Promise<RunnerExecution<TOperation>> {
        const startedAt = this.dependencies.clock.now();

        this.observer.observe({ type: 'execution.started', context });

        try {
            const execution = await this.executeClaimed(command, entry, context);

            this.observer.observe({
                type: 'execution.completed',
                context,
                outcome: isOperationRejection(execution.result) ? 'rejected' : 'success',
                durationMs: this.durationSince(startedAt),
            });

            return execution;
        } catch (error: unknown) {
            this.observer.observe({
                type: 'execution.completed',
                context,
                outcome: error instanceof ExecutionTimedOutError ? 'timed-out' : 'error',
                durationMs: this.durationSince(startedAt),
            });

            throw error;
        }
    }

    private claimExecution<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        executionId: InProgressExecutionLogEntry<TOperation>['executionId'],
    ) {
        return this.dependencies.executionLogStore.claim({
            executionId,
            operation: command.operation,
            correlationId: command.context.correlationId,
            leaseOwnerId: this.runtime.leaseOwnerId,
            leaseDurationMs: this.options.leaseDurationMs,
            requestedAt: this.dependencies.clock.now(),
        });
    }

    private async executeClaimed<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        entry: InProgressExecutionLogEntry<TOperation>,
        context: RunnerObservationContext,
    ): Promise<RunnerExecution<TOperation>> {
        const leaseReference = this.getLeaseReference(entry);

        try {
            await this.evaluateGuards(command);
            await this.enforceRateLimit(command);
        } catch (error: unknown) {
            if (error instanceof ExecutionGuardRejectedError) {
                this.observer.observe({ type: 'guard.rejected', context });
            }

            if (error instanceof ExecutionRateLimitRejectedError) {
                this.observer.observe({ type: 'rate-limit.rejected', context });
            }

            await this.recordExecutionFailure(entry, leaseReference, error, 'failed');

            throw error;
        }

        let handler: ResolvedOperationHandler<TOperation>;

        try {
            handler = this.dependencies.operationHandlerResolver.resolve(command.operation);
        } catch (error: unknown) {
            await this.recordExecutionFailure(entry, leaseReference, error, 'failed');

            throw error;
        }

        return this.executeHandlerAttempts(command, handler, entry, context);
    }

    private async executeHandlerAttempts<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        handler: ResolvedOperationHandler<TOperation>,
        initialEntry: InProgressExecutionLogEntry<TOperation>,
        context: RunnerObservationContext,
    ): Promise<RunnerExecution<TOperation>> {
        let entry = initialEntry;
        let handlerAttemptNumber = 1;

        while (true) {
            const attemptStartedAt = this.dependencies.clock.now();

            this.observer.observe({
                type: 'attempt.started',
                context,
                attempt: handlerAttemptNumber,
            });

            const outcome = await this.executeHandlerAttempt(command, handler, entry);

            if (outcome.type === 'completed') {
                this.observer.observe({
                    type: 'attempt.completed',
                    context,
                    attempt: handlerAttemptNumber,
                    outcome: isOperationRejection(outcome.execution.result) ? 'rejected' : 'success',
                    retryable: false,
                    durationMs: this.durationSince(attemptStartedAt),
                });

                return outcome.execution;
            }

            const retry = command.options?.retry;
            const failure = normalizeExecutionFailure(outcome.error);
            const canRetry =
                outcome.failureRecorded &&
                retry !== undefined &&
                failure.retryable &&
                handlerAttemptNumber < retry.maxAttempts;

            this.observer.observe({
                type: 'attempt.completed',
                context,
                attempt: handlerAttemptNumber,
                outcome: outcome.error instanceof ExecutionTimedOutError ? 'timed-out' : 'error',
                retryable: failure.retryable,
                durationMs: this.durationSince(attemptStartedAt),
            });

            if (!canRetry) {
                throw outcome.error;
            }

            const retryNumber = handlerAttemptNumber;
            const delayMs = calculateRetryDelay(retry.strategy, retryNumber);

            this.observer.observe({
                type: 'retry.scheduled',
                context,
                attempt: retryNumber,
                delayMs,
            });

            if (delayMs > 0) {
                await this.retryDelay.wait(delayMs);
            }

            const claim = await this.claimExecution(command, entry.executionId);

            switch (claim.type) {
                case 'completed':
                    this.observer.observe({ type: 'idempotency.hit', context });
                    return {
                        executionId: claim.entry.executionId,
                        resultSource: 'stored',
                        result: claim.entry.result,
                    };

                case 'already-in-progress':
                    this.observer.observe({
                        type: 'claim.rejected',
                        context,
                        reason: 'already-in-progress',
                    });
                    throw new ExecutionAlreadyInProgressError(claim.entry.executionId);

                case 'intent-conflict':
                    this.observer.observe({
                        type: 'claim.rejected',
                        context,
                        reason: 'intent-conflict',
                    });
                    throw new ExecutionIntentConflictError(claim.entry.executionId);

                case 'claimed':
                    entry = claim.entry;
                    handlerAttemptNumber += 1;
                    break;
            }
        }
    }

    private async executeHandlerAttempt<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        handler: ResolvedOperationHandler<TOperation>,
        entry: InProgressExecutionLogEntry<TOperation>,
    ): Promise<HandlerAttemptOutcome<TOperation>> {
        const leaseReference = this.getLeaseReference(entry);

        try {
            const result = await this.dependencies.executionTransaction.execute(async () => {
                const operationResult = await this.executeHandlerWithTimeout(command, handler);

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
                type: 'completed',
                execution: {
                    executionId: entry.executionId,
                    resultSource: 'executed',
                    result,
                },
            };
        } catch (error: unknown) {
            const failureRecorded = await this.recordExecutionFailure(
                entry,
                leaseReference,
                error,
                error instanceof ExecutionTimedOutError ? 'timed-out' : 'failed',
            );

            return {
                type: 'failed',
                entry,
                error,
                failureRecorded,
            };
        }
    }

    private async executeHandlerWithTimeout<TOperation extends AnyOperation>(
        command: Command<TOperation>,
        handler: ResolvedOperationHandler<TOperation>,
    ): Promise<OperationResultOf<TOperation>> {
        const timeoutMs = command.options?.timeoutMs;

        if (timeoutMs === undefined) {
            return handler.execute(command.operation);
        }

        const timedExecution = await this.executionTimeout.execute(
            () => handler.execute(command.operation),
            timeoutMs,
        );

        if (timedExecution.type === 'timed-out') {
            throw new ExecutionTimedOutError(timeoutMs);
        }

        return timedExecution.result;
    }

    private getLeaseReference<TOperation extends AnyOperation>(
        entry: InProgressExecutionLogEntry<TOperation>,
    ): ExecutionLeaseReference {
        return {
            ownerId: entry.lease.ownerId,
            version: entry.lease.version,
        };
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
    ): Promise<boolean> {
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

            return true;
        } catch {
            /*
             * Failure recording must not replace the original
             * execution error.
             *
             * The active lease will eventually expire and allow
             * another Runner to reclaim the execution.
             */
            return false;
        }
    }

    private createObservationContext<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): RunnerObservationContext {
        return {
            operation: command.operation.name,
            tenant: command.operation.tenant,
            intentId: command.operation.intent.id,
            correlationId: command.context.correlationId,
        };
    }

    private durationSince(startedAt: string): number {
        return Math.max(0, Date.parse(this.dependencies.clock.now()) - Date.parse(startedAt));
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

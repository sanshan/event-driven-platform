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

import { ExecutionAlreadyInProgressError } from './execution-already-in-progress.error.js';
import { ExecutionIntentConflictError } from './execution-intent-conflict.error.js';
import { ExecutionTransitionRejectedError } from './execution-transition-rejected.error.js';
import { normalizeExecutionFailure } from './normalize-execution-failure.js';
import type { RunnerDependencies } from './runner-dependencies.js';
import type { RunnerExecution } from './runner-execution.js';
import type { RunnerOptions } from './runner-options.js';
import type { RunnerRuntime } from './runner-runtime.js';
import type { Runner } from './runner.js';

export class DefaultRunner implements Runner {
    constructor(
        private readonly dependencies: RunnerDependencies,
        private readonly runtime: RunnerRuntime,
        private readonly options: RunnerOptions,
    ) {}

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
            const handler = this.dependencies.operationHandlerResolver.resolve(command.operation);

            const result = await this.dependencies.executionTransaction.execute(async () => {
                const operationResult = await handler.execute(command.operation);

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
            await this.recordExecutionFailure(entry, leaseReference, error);

            throw error;
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
    ): Promise<void> {
        try {
            await this.dependencies.executionTransaction.execute(async () => {
                const failureResult = await this.dependencies.executionLogStore.fail<TOperation>({
                    executionId: entry.executionId,
                    attemptId: entry.latestAttempt.attemptId,
                    lease,
                    status: 'failed',
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

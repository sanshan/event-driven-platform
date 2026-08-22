import type { ExecutionId } from '@event-driven-platform/execution';

import type { UseCaseExecutor } from './use-case-executor.js';
import type { UseCaseExecutorDependencies } from './use-case-executor-dependencies.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionTransitionError,
    UseCaseIntentConflictError,
} from './use-case-executor-error.js';
import type { UseCaseExecutionRequest } from './use-case-execution-request.js';
import type { UseCaseExecutorRuntime } from './use-case-executor-runtime.js';

const USE_CASE_EXECUTION_LEASE_DURATION_MS = 30_000;

export class DefaultUseCaseExecutor implements UseCaseExecutor {
    public constructor(
        private readonly dependencies: UseCaseExecutorDependencies,
        private readonly runtime: UseCaseExecutorRuntime,
    ) {}

    public async execute<TInput, TResult>(
        request: UseCaseExecutionRequest<TInput, TResult>,
    ): Promise<TResult> {
        const executionId = this.dependencies.executionIdFactory.create(request.intent.id);
        const claim = await this.dependencies.store.claim<TResult>({
            executionId,
            intent: request.intent,
            correlationId: request.correlationId,
            leaseOwnerId: this.runtime.leaseOwnerId,
            leaseDurationMs: USE_CASE_EXECUTION_LEASE_DURATION_MS,
            requestedAt: this.dependencies.clock.now(),
        });

        switch (claim.type) {
            case 'completed':
                return claim.result;
            case 'already-in-progress':
                throw new UseCaseAlreadyInProgressError(executionId);
            case 'intent-conflict':
                throw new UseCaseIntentConflictError(executionId, claim.existingIntentId);
            case 'claimed':
                break;
        }

        let result: TResult;

        try {
            result = await request.useCase.execute(request.input, {
                intent: request.intent,
                correlationId: request.correlationId,
            });
        } catch (error) {
            try {
                await this.dependencies.store.release({
                    executionId,
                    lease: claim.lease,
                    releasedAt: this.dependencies.clock.now(),
                });
            } catch {
                // The original UseCase failure remains authoritative.
            }

            throw error;
        }

        const completion = await this.dependencies.store.complete({
            executionId,
            lease: claim.lease,
            result,
            completedAt: this.dependencies.clock.now(),
        });

        if (completion.type !== 'completed') {
            throw new UseCaseExecutionTransitionError(executionId, 'complete', completion);
        }

        return result;
    }
}

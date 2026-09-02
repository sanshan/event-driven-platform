import {
    NoopObserver,
    SafeObserver,
    type UseCaseExecutorObservation,
    type UseCaseExecutorObservationContext,
    type UseCaseExecutorObserver,
} from '@event-driven-platform/observability';
import type { UseCaseContext } from '@event-driven-platform/use-case';

import { UseCaseClaimRejectedError } from '../errors/use-case-claim-rejected.error.js';
import { UseCaseExecutionTransitionError } from '../errors/use-case-execution-transition.error.js';
import type { UseCaseExecutionRequest } from './use-case-execution-request.js';
import type { UseCaseExecutor } from './use-case-executor.js';
import type { UseCaseExecutorDependencies } from './use-case-executor-dependencies.js';
import type { UseCaseExecutorRuntime } from './use-case-executor-runtime.js';

const USE_CASE_EXECUTION_LEASE_DURATION_MS = 30_000;

export class DefaultUseCaseExecutor implements UseCaseExecutor {
    private readonly observer: UseCaseExecutorObserver;

    public constructor(
        private readonly dependencies: UseCaseExecutorDependencies,
        private readonly runtime: UseCaseExecutorRuntime,
    ) {
        this.observer = new SafeObserver(
            dependencies.observer ?? new NoopObserver<UseCaseExecutorObservation>(),
        );
    }

    public async execute<TInput, TResult, TContext extends UseCaseContext = UseCaseContext>(
        request: UseCaseExecutionRequest<TInput, TResult, TContext>,
    ): Promise<TResult> {
        const context: UseCaseExecutorObservationContext = {
            useCase: request.useCase.name,
            intentId: request.context.intent.id,
            correlationId: request.context.correlationId,
        };
        const executionId = this.dependencies.executionIdFactory.create(request.context.intent.id);

        this.observer.observe({ type: 'execution.requested', context });

        const claimStartedAt = this.dependencies.clock.now();
        const claim = await this.dependencies.store.claim<TResult>({
            executionId,
            intent: request.context.intent,
            correlationId: request.context.correlationId,
            leaseOwnerId: this.runtime.leaseOwnerId,
            leaseDurationMs: USE_CASE_EXECUTION_LEASE_DURATION_MS,
            requestedAt: claimStartedAt,
        });

        this.observer.observe({
            type: 'claim.completed',
            context,
            outcome: claim.type,
            durationMs: this.durationSince(claimStartedAt),
        });

        switch (claim.type) {
            case 'completed':
                return claim.result;
            case 'already-in-progress':
                throw new UseCaseClaimRejectedError(executionId, 'already-in-progress');
            case 'intent-conflict':
                throw new UseCaseClaimRejectedError(
                    executionId,
                    'intent-conflict',
                    claim.existingIntentId,
                );
            case 'claimed':
                break;
        }

        const executionStartedAt = this.dependencies.clock.now();
        this.observer.observe({ type: 'execution.started', context });

        let result: TResult;

        try {
            result = await request.useCase.execute(request.input, request.context);
        } catch (error) {
            this.observer.observe({
                type: 'execution.completed',
                context,
                outcome: 'error',
                durationMs: this.durationSince(executionStartedAt),
            });

            const releaseStartedAt = this.dependencies.clock.now();
            try {
                await this.dependencies.store.release({
                    executionId,
                    lease: claim.lease,
                    releasedAt: releaseStartedAt,
                });
                this.observer.observe({
                    type: 'release.completed',
                    context,
                    outcome: 'released',
                    durationMs: this.durationSince(releaseStartedAt),
                });
            } catch {
                this.observer.observe({
                    type: 'release.completed',
                    context,
                    outcome: 'error',
                    durationMs: this.durationSince(releaseStartedAt),
                });
                // The original UseCase failure remains authoritative.
            }

            throw error;
        }

        this.observer.observe({
            type: 'execution.completed',
            context,
            outcome: 'success',
            durationMs: this.durationSince(executionStartedAt),
        });

        const completionStartedAt = this.dependencies.clock.now();
        const completion = await this.dependencies.store.complete({
            executionId,
            lease: claim.lease,
            result,
            completedAt: completionStartedAt,
        });

        this.observer.observe({
            type: 'completion.completed',
            context,
            outcome: completion.type === 'completed' ? 'completed' : 'rejected',
            durationMs: this.durationSince(completionStartedAt),
        });

        if (completion.type !== 'completed') {
            throw new UseCaseExecutionTransitionError(executionId, 'complete', completion);
        }

        return result;
    }

    private durationSince(startedAt: string): number {
        return Math.max(0, Date.parse(this.dependencies.clock.now()) - Date.parse(startedAt));
    }
}

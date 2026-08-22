import type { ExecutionId, ExecutionLease } from '@event-driven-platform/execution';

import type { UseCaseExecutor } from './use-case-executor.js';
import type { UseCaseExecutorDependencies } from './use-case-executor-dependencies.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionOwnershipLostError,
    UseCaseExecutionTransitionError,
    UseCaseExecutorConfigurationError,
    UseCaseIntentConflictError,
} from './use-case-executor-error.js';
import type { UseCaseExecutionRequest } from './use-case-execution-request.js';
import type { UseCaseExecutorRuntime } from './use-case-executor-runtime.js';
import {
    SystemUseCaseExecutorTimer,
    type UseCaseExecutorTimer,
    type UseCaseExecutorTimerHandle,
} from './use-case-executor-timer.js';

export class DefaultUseCaseExecutor implements UseCaseExecutor {
    private readonly renewalIntervalMs: number;
    private readonly timer: UseCaseExecutorTimer;

    public constructor(
        private readonly dependencies: UseCaseExecutorDependencies,
        private readonly runtime: UseCaseExecutorRuntime,
    ) {
        this.renewalIntervalMs = resolveRenewalInterval(runtime);
        this.timer = dependencies.timer ?? new SystemUseCaseExecutorTimer();
    }

    public async execute<TInput, TResult>(
        request: UseCaseExecutionRequest<TInput, TResult>,
    ): Promise<TResult> {
        const executionId = this.dependencies.executionIdFactory.create(request.intent.id);
        const claim = await this.dependencies.store.claim<TResult>({
            executionId,
            intent: request.intent,
            correlationId: request.correlationId,
            leaseOwnerId: this.runtime.leaseOwnerId,
            leaseDurationMs: this.runtime.leaseDurationMs,
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

        const renewal = this.startRenewal(executionId, claim.lease);
        let result: TResult;

        try {
            result = await request.useCase.execute(request.input, {
                intent: request.intent,
                correlationId: request.correlationId,
            });
        } catch (error) {
            const ownership = await renewal.stop();

            if (ownership.confirmed) {
                try {
                    await this.dependencies.store.release({
                        executionId,
                        lease: ownership.lease,
                        releasedAt: this.dependencies.clock.now(),
                    });
                } catch {
                    // The original UseCase failure remains authoritative.
                }
            }

            throw error;
        }

        const ownership = await renewal.stop();

        if (!ownership.confirmed) {
            throw new UseCaseExecutionOwnershipLostError(executionId);
        }

        const completion = await this.dependencies.store.complete({
            executionId,
            lease: ownership.lease,
            result,
            completedAt: this.dependencies.clock.now(),
        });

        if (completion.type !== 'completed') {
            throw new UseCaseExecutionTransitionError(executionId, 'complete', completion);
        }

        return result;
    }

    private startRenewal(executionId: ExecutionId, initialLease: ExecutionLease): RenewalLifecycle {
        let lease = initialLease;
        let ownershipConfirmed = true;
        let stopped = false;
        let scheduled: UseCaseExecutorTimerHandle | undefined;
        let inFlight: Promise<void> | undefined;

        const scheduleNext = () => {
            if (stopped || !ownershipConfirmed) {
                return;
            }

            scheduled = this.timer.schedule(this.renewalIntervalMs, () => {
                if (stopped || !ownershipConfirmed) {
                    return;
                }

                inFlight = renew().finally(() => {
                    inFlight = undefined;
                });
            });
        };

        const renew = async () => {
            try {
                const result = await this.dependencies.store.renewLease({
                    executionId,
                    lease,
                    leaseDurationMs: this.runtime.leaseDurationMs,
                    requestedAt: this.dependencies.clock.now(),
                });

                if (result.type !== 'renewed') {
                    ownershipConfirmed = false;
                    return;
                }

                lease = result.lease;
                scheduleNext();
            } catch {
                ownershipConfirmed = false;
            }
        };

        scheduleNext();

        return {
            stop: async () => {
                stopped = true;
                scheduled?.cancel();
                await inFlight;

                return ownershipConfirmed
                    ? { confirmed: true, lease }
                    : { confirmed: false };
            },
        };
    }
}

interface RenewalLifecycle {
    stop(): Promise<RenewalOwnership>;
}

type RenewalOwnership =
    | { readonly confirmed: true; readonly lease: ExecutionLease }
    | { readonly confirmed: false };

function resolveRenewalInterval(runtime: UseCaseExecutorRuntime): number {
    if (!Number.isFinite(runtime.leaseDurationMs) || runtime.leaseDurationMs <= 0) {
        throw new UseCaseExecutorConfigurationError('leaseDurationMs must be a positive finite number.');
    }

    const renewalIntervalMs = runtime.renewalIntervalMs ?? runtime.leaseDurationMs / 2;

    if (!Number.isFinite(renewalIntervalMs) || renewalIntervalMs <= 0) {
        throw new UseCaseExecutorConfigurationError(
            'renewalIntervalMs must be a positive finite number.',
        );
    }

    if (renewalIntervalMs >= runtime.leaseDurationMs) {
        throw new UseCaseExecutorConfigurationError(
            'renewalIntervalMs must be strictly less than leaseDurationMs.',
        );
    }

    return renewalIntervalMs;
}

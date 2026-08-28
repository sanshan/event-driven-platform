import type { Clock } from '@event-driven-platform/clock';
import type { ReaderObservationContext, ReaderObserver } from '@event-driven-platform/observability';
import type {
    ReadExecutionCoordinator,
    ReadExecutionLeaseReference,
} from '@event-driven-platform/read-execution-coordinator';
import type { ReadCacheKey } from '@event-driven-platform/query';

import { ReadExecutionCoordinatorUnavailableError } from '../errors/read-execution-coordinator-unavailable.error.js';
import { ReadExecutionOwnershipLostError } from '../errors/read-execution-ownership-lost.error.js';

type SharedReadResult<TResult> =
    | { readonly status: 'hit'; readonly value: TResult }
    | { readonly status: 'miss' };

interface DistributedReadFlightRequest<TResult> {
    readonly key: ReadCacheKey;
    readonly ownerId: string;
    readonly leaseDurationMs: number;
    readonly readShared: () => Promise<SharedReadResult<TResult>>;
    readonly executeSource: () => Promise<TResult>;
    readonly publishSourceResult: (result: TResult) => Promise<void>;
}

export interface DistributedReadFlightDependencies {
    readonly coordinator: ReadExecutionCoordinator;
    readonly clock: Clock;
    readonly observer: ReaderObserver;
    readonly context: ReaderObservationContext;
}

export class DistributedReadFlight {
    constructor(private readonly dependencies: DistributedReadFlightDependencies) {}

    async run<TResult>(request: DistributedReadFlightRequest<TResult>): Promise<TResult> {
        while (true) {
            const startedAt = this.dependencies.clock.now();
            const claim = await this.dependencies.coordinator.claim({
                key: request.key,
                ownerId: request.ownerId,
                leaseDurationMs: request.leaseDurationMs,
            });

            if (claim.status === 'unavailable') {
                this.observeCoordination('unavailable', startedAt);
                throw new ReadExecutionCoordinatorUnavailableError(claim.reason);
            }

            if (claim.status === 'already-in-progress') {
                const afterWait = await this.waitForCurrentFlight(request, startedAt);
                if (afterWait.status === 'hit') {
                    return afterWait.value;
                }

                continue;
            }

            this.observeCoordination('owner', startedAt);
            return this.runAsOwner(request, claim.lease);
        }
    }

    private async waitForCurrentFlight<TResult>(
        request: DistributedReadFlightRequest<TResult>,
        startedAt: string,
    ): Promise<SharedReadResult<TResult>> {
        const wait = await this.dependencies.coordinator.wait({
            key: request.key,
            timeoutMs: request.leaseDurationMs,
        });

        if (wait.status === 'unavailable') {
            this.observeCoordination('unavailable', startedAt);
            throw new ReadExecutionCoordinatorUnavailableError(wait.reason);
        }

        this.observeCoordination('waiter', startedAt);
        return request.readShared();
    }

    private async runAsOwner<TResult>(
        request: DistributedReadFlightRequest<TResult>,
        lease: ReadExecutionLeaseReference,
    ): Promise<TResult> {
        let leaseState: 'owned' | 'lost' | 'unavailable' = 'owned';
        let unavailableReason: string | undefined;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let renewing: Promise<void> | undefined;
        const intervalMs = Math.max(1, Math.floor(request.leaseDurationMs / 2));

        const scheduleRenewal = (): void => {
            timer = setTimeout(() => {
                renewing = renew().finally(() => {
                    renewing = undefined;
                });
            }, intervalMs);
        };

        const renew = async (): Promise<void> => {
            if (stopped || leaseState !== 'owned') {
                return;
            }

            const startedAt = this.dependencies.clock.now();
            const result = await this.dependencies.coordinator.renew({
                key: request.key,
                lease,
                leaseDurationMs: request.leaseDurationMs,
            });

            if (result.status === 'ownership-lost') {
                leaseState = 'lost';
                this.observeCoordination('ownership-lost', startedAt);
                return;
            }

            if (result.status === 'unavailable') {
                leaseState = 'unavailable';
                unavailableReason = result.reason;
                this.observeCoordination('unavailable', startedAt);
                return;
            }

            if (!stopped) {
                scheduleRenewal();
            }
        };

        const synchronizeRenewal = async (): Promise<void> => {
            if (renewing !== undefined) {
                await renewing;
            }

            this.assertOwnership(leaseState, unavailableReason);
        };

        scheduleRenewal();

        try {
            const sharedResult = await request.readShared();
            if (sharedResult.status === 'hit') {
                return sharedResult.value;
            }

            const sourceResult = await request.executeSource();

            await synchronizeRenewal();
            await request.publishSourceResult(sourceResult);
            await synchronizeRenewal();

            return sourceResult;
        } finally {
            stopped = true;
            if (timer !== undefined) {
                clearTimeout(timer);
            }

            if (renewing !== undefined) {
                try {
                    await renewing;
                } catch {
                    // Renewal failure has already been represented through coordinator outcomes.
                }
            }

            try {
                await this.dependencies.coordinator.release({ key: request.key, lease });
            } catch {
                // The lease is TTL-bounded; release failure must not replace a completed business read.
            }
        }
    }

    private assertOwnership(
        leaseState: 'owned' | 'lost' | 'unavailable',
        unavailableReason: string | undefined,
    ): void {
        if (leaseState === 'lost') {
            throw new ReadExecutionOwnershipLostError();
        }

        if (leaseState === 'unavailable') {
            throw new ReadExecutionCoordinatorUnavailableError(
                unavailableReason ?? 'lease renewal failed',
            );
        }
    }

    private observeCoordination(
        outcome: 'owner' | 'waiter' | 'unavailable' | 'ownership-lost',
        startedAt: string,
    ): void {
        this.dependencies.observer.observe({
            type: 'distributed-coordination.completed',
            context: this.dependencies.context,
            outcome,
            durationMs: Math.max(
                0,
                Date.parse(this.dependencies.clock.now()) - Date.parse(startedAt),
            ),
        });
    }
}

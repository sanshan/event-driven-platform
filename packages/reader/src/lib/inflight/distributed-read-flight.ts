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

export class DistributedReadFlight {
    constructor(private readonly coordinator: ReadExecutionCoordinator) {}

    async run<TResult>(request: DistributedReadFlightRequest<TResult>): Promise<TResult> {
        while (true) {
            const claim = await this.coordinator.claim({
                key: request.key,
                ownerId: request.ownerId,
                leaseDurationMs: request.leaseDurationMs,
            });

            if (claim.status === 'unavailable') {
                throw new ReadExecutionCoordinatorUnavailableError(claim.reason);
            }

            if (claim.status === 'already-in-progress') {
                const afterWait = await this.waitForCurrentFlight(request);
                if (afterWait.status === 'hit') {
                    return afterWait.value;
                }

                continue;
            }

            return this.runAsOwner(request, claim.lease);
        }
    }

    private async waitForCurrentFlight<TResult>(
        request: DistributedReadFlightRequest<TResult>,
    ): Promise<SharedReadResult<TResult>> {
        const wait = await this.coordinator.wait({
            key: request.key,
            timeoutMs: request.leaseDurationMs,
        });

        if (wait.status === 'unavailable') {
            throw new ReadExecutionCoordinatorUnavailableError(wait.reason);
        }

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

            const result = await this.coordinator.renew({
                key: request.key,
                lease,
                leaseDurationMs: request.leaseDurationMs,
            });

            if (result.status === 'ownership-lost') {
                leaseState = 'lost';
                return;
            }

            if (result.status === 'unavailable') {
                leaseState = 'unavailable';
                unavailableReason = result.reason;
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
                await this.coordinator.release({ key: request.key, lease });
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
}

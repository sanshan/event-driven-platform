import type {
    ReadExecutionCoordinator,
    ReadExecutionLeaseReference,
} from '@event-driven-platform/read-execution-coordinator';
import type { ReadCacheKey } from '@event-driven-platform/query';

import { ReadExecutionCoordinatorUnavailableError } from './read-execution-coordinator-unavailable.error.js';
import { ReadExecutionOwnershipLostError } from './read-execution-ownership-lost.error.js';

interface DistributedReadFlightRequest<TResult> {
    readonly key: ReadCacheKey;
    readonly ownerId: string;
    readonly leaseDurationMs: number;
    readonly readShared: () => Promise<TResult | undefined>;
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
                if (afterWait !== undefined) {
                    return afterWait;
                }

                continue;
            }

            return this.runAsOwner(request, claim.lease);
        }
    }

    private async waitForCurrentFlight<TResult>(
        request: DistributedReadFlightRequest<TResult>,
    ): Promise<TResult | undefined> {
        const wait = await this.coordinator.wait({
            key: request.key,
            timeoutMs: request.leaseDurationMs,
        });

        if (wait.status === 'unavailable') {
            throw new ReadExecutionCoordinatorUnavailableError(wait.reason);
        }

        if (wait.status === 'cancelled') {
            return undefined;
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
            }
        };

        const intervalMs = Math.max(1, Math.floor(request.leaseDurationMs / 2));
        const timer = setInterval(() => {
            void renew();
        }, intervalMs);

        try {
            const sharedResult = await request.readShared();
            if (sharedResult !== undefined) {
                return sharedResult;
            }

            const sourceResult = await request.executeSource();

            if (leaseState === 'lost') {
                throw new ReadExecutionOwnershipLostError();
            }

            if (leaseState === 'unavailable') {
                throw new ReadExecutionCoordinatorUnavailableError(
                    unavailableReason ?? 'lease renewal failed',
                );
            }

            await request.publishSourceResult(sourceResult);

            if (leaseState === 'lost') {
                throw new ReadExecutionOwnershipLostError();
            }

            if (leaseState === 'unavailable') {
                throw new ReadExecutionCoordinatorUnavailableError(
                    unavailableReason ?? 'lease renewal failed',
                );
            }

            return sourceResult;
        } finally {
            stopped = true;
            clearInterval(timer);
            await this.coordinator.release({ key: request.key, lease });
        }
    }
}

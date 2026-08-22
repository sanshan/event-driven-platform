import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';

export interface UseCaseExecutorRuntime {
    readonly leaseOwnerId: ExecutionLeaseOwnerId;
    readonly leaseDurationMs: number;
}

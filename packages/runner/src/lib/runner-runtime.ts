import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';

export interface RunnerRuntime {
    readonly leaseOwnerId: ExecutionLeaseOwnerId;
}

import type {
    ExecutionLeaseOwnerId,
    ExecutionLeaseVersion,
} from '@event-driven-platform/execution';

/**
 * Identifies the lease expected by an execution state transition.
 *
 * The owner and version together protect an Execution from being
 * completed or failed by a stale Runner.
 */
export interface ExecutionLeaseReference {
    readonly ownerId: ExecutionLeaseOwnerId;

    readonly version: ExecutionLeaseVersion;
}

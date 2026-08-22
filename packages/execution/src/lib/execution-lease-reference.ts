import type { ExecutionLeaseOwnerId } from './execution-lease-owner-id.js';
import type { ExecutionLeaseVersion } from './execution-lease-version.js';

/** Identifies the fenced lease expected by an execution state transition. */
export interface ExecutionLeaseReference {
    readonly ownerId: ExecutionLeaseOwnerId;

    readonly version: ExecutionLeaseVersion;
}

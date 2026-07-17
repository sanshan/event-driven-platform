import type { ExecutionLeaseOwnerId } from './execution-lease-owner-id.js';
import type { ExecutionLeaseVersion } from './execution-lease-version.js';

export interface ExecutionLease {
    readonly ownerId: ExecutionLeaseOwnerId;

    readonly version: ExecutionLeaseVersion;

    readonly acquiredAt: string;

    readonly expiresAt: string;
}

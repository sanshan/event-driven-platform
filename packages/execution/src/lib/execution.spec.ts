import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ExecutionAttemptId } from './execution-attempt-id.js';
import type { ExecutionFailure } from './execution-failure.js';
import type { ExecutionId } from './execution-id.js';
import type { ExecutionLease } from './execution-lease.js';
import type { ExecutionLeaseOwnerId } from './execution-lease-owner-id.js';
import type { ExecutionLeaseVersion } from './execution-lease-version.js';

describe('Execution', () => {
    it('distinguishes ExecutionId from ExecutionAttemptId', () => {
        expectTypeOf<ExecutionId>().not.toEqualTypeOf<ExecutionAttemptId>();
    });

    it('describes a serializable infrastructure failure', () => {
        const failure: ExecutionFailure = {
            code: 'database-unavailable',
            message: 'The execution database is unavailable.',
            retryable: true,
        };

        expect(failure).toEqual({
            code: 'database-unavailable',
            message: 'The execution database is unavailable.',
            retryable: true,
        });

        expectTypeOf(failure.code).toEqualTypeOf<string>();
        expectTypeOf(failure.retryable).toEqualTypeOf<boolean>();
    });

    it('describes temporary ownership of an Execution', () => {
        const ownerId = 'runner-instance-1' as ExecutionLeaseOwnerId;

        const version = 1 as ExecutionLeaseVersion;

        const lease: ExecutionLease = {
            ownerId,
            version,
            acquiredAt: '2026-07-17T10:00:00.000Z',
            expiresAt: '2026-07-17T10:01:00.000Z',
        };

        expect(lease).toEqual({
            ownerId: 'runner-instance-1',
            version: 1,
            acquiredAt: '2026-07-17T10:00:00.000Z',
            expiresAt: '2026-07-17T10:01:00.000Z',
        });

        expectTypeOf(lease.ownerId).toEqualTypeOf<ExecutionLeaseOwnerId>();

        expectTypeOf(lease.version).toEqualTypeOf<ExecutionLeaseVersion>();
    });
});

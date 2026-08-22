import type {
    ExecutionId,
    ExecutionLease,
    ExecutionLeaseOwnerId,
    ExecutionLeaseReference,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';
import { describe, expectTypeOf, it } from 'vitest';

import type {
    ClaimUseCaseExecutionRequest,
    ClaimUseCaseExecutionResult,
} from './claim-use-case-execution.js';
import type {
    CompleteUseCaseExecutionRequest,
    CompleteUseCaseExecutionResult,
} from './complete-use-case-execution.js';
import type {
    ReleaseUseCaseExecutionRequest,
    ReleaseUseCaseExecutionResult,
} from './release-use-case-execution.js';
import type { UseCaseExecutionStore } from './use-case-execution-store.js';

interface TestResult {
    readonly value: string;
}

const executionId = 'execution-1' as ExecutionId;
const leaseOwnerId = 'owner-1' as ExecutionLeaseOwnerId;
const intent: Intent = { id: 'intent-1', key: 'test:intent' };
const lease = {
    ownerId: leaseOwnerId,
    version: 1,
    acquiredAt: '2026-08-22T05:00:00.000Z',
    expiresAt: '2026-08-22T05:00:30.000Z',
} as ExecutionLease;
const leaseReference: ExecutionLeaseReference = {
    ownerId: lease.ownerId,
    version: lease.version,
};

describe('UseCaseExecutionStore contract', () => {
    it('claims by authoritative Intent identity with a fixed lease duration supplied by the Executor', () => {
        const request: ClaimUseCaseExecutionRequest = {
            executionId,
            intent,
            correlationId: 'correlation-1',
            leaseOwnerId,
            leaseDurationMs: 30_000,
            requestedAt: '2026-08-22T05:00:00.000Z',
        };

        expectTypeOf(request).toEqualTypeOf<ClaimUseCaseExecutionRequest>();
        expectTypeOf<ClaimUseCaseExecutionResult<TestResult>>().toEqualTypeOf<
            | { readonly type: 'claimed'; readonly lease: ExecutionLease }
            | {
                  readonly type: 'completed';
                  readonly result: TestResult;
                  readonly completedAt: string;
              }
            | { readonly type: 'already-in-progress'; readonly lease: ExecutionLease }
            | { readonly type: 'intent-conflict'; readonly existingIntentId: string }
        >();
    });

    it('fences complete and release with the shared lease reference', () => {
        const completeRequest: CompleteUseCaseExecutionRequest<TestResult> = {
            executionId,
            lease: leaseReference,
            result: { value: 'done' },
            completedAt: '2026-08-22T05:00:20.000Z',
        };
        const releaseRequest: ReleaseUseCaseExecutionRequest = {
            executionId,
            lease: leaseReference,
            releasedAt: '2026-08-22T05:00:20.000Z',
        };

        expectTypeOf(completeRequest.lease).toEqualTypeOf<ExecutionLeaseReference>();
        expectTypeOf(releaseRequest.lease).toEqualTypeOf<ExecutionLeaseReference>();
    });

    it('exposes deterministic completion/release rejection outcomes', () => {
        expectTypeOf<CompleteUseCaseExecutionResult>().toEqualTypeOf<
            | { readonly type: 'completed'; readonly completedAt: string }
            | { readonly type: 'not-found' }
            | { readonly type: 'not-in-progress' }
            | { readonly type: 'lease-conflict' }
        >();
        expectTypeOf<ReleaseUseCaseExecutionResult>().toEqualTypeOf<
            | { readonly type: 'released'; readonly releasedAt: string }
            | { readonly type: 'not-found' }
            | { readonly type: 'not-in-progress' }
            | { readonly type: 'lease-conflict' }
        >();
    });

    it('contains only the transitions required by the fixed-lease Executor', () => {
        expectTypeOf<keyof UseCaseExecutionStore>().toEqualTypeOf<'claim' | 'complete' | 'release'>();
    });
});

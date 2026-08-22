import type {
    ExecutionId,
    ExecutionLease,
    ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import type { Intent } from '@event-driven-platform/intent';

export interface ClaimUseCaseExecutionRequest {
    readonly executionId: ExecutionId;

    readonly intent: Intent;

    readonly correlationId: string;

    readonly leaseOwnerId: ExecutionLeaseOwnerId;

    readonly leaseDurationMs: number;

    readonly requestedAt: string;
}

export interface UseCaseExecutionClaimed {
    readonly type: 'claimed';

    readonly lease: ExecutionLease;
}

export interface CompletedUseCaseExecutionFound<TResult> {
    readonly type: 'completed';

    readonly result: TResult;

    readonly completedAt: string;
}

export interface UseCaseExecutionAlreadyInProgress {
    readonly type: 'already-in-progress';

    readonly lease: ExecutionLease;
}

export interface UseCaseExecutionIntentConflict {
    readonly type: 'intent-conflict';

    readonly existingIntentId: string;
}

export type ClaimUseCaseExecutionResult<TResult> =
    | UseCaseExecutionClaimed
    | CompletedUseCaseExecutionFound<TResult>
    | UseCaseExecutionAlreadyInProgress
    | UseCaseExecutionIntentConflict;

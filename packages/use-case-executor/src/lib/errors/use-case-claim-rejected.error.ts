import type { ExecutionId } from '@event-driven-platform/execution';
import { ExecutionFailureError } from '@event-driven-platform/execution';

export type UseCaseClaimRejectionReason = 'already-in-progress' | 'intent-conflict';

/**
 * "already-in-progress" is retryable: the owning attempt is expected to
 * finish or its lease to expire on its own. "intent-conflict" is a
 * structural mismatch between the claimed execution and the persisted
 * Intent that retrying the same claim cannot resolve.
 */
const DETAILS: Record<
    UseCaseClaimRejectionReason,
    { readonly retryable: boolean; readonly message: (executionId: ExecutionId) => string }
> = {
    'already-in-progress': {
        retryable: true,
        message: (executionId) => `UseCase execution ${executionId} is already in progress.`,
    },
    'intent-conflict': {
        retryable: false,
        message: (executionId) => `UseCase execution ${executionId} is associated with another Intent.`,
    },
};

export class UseCaseClaimRejectedError extends ExecutionFailureError {
    readonly executionId: ExecutionId;

    readonly reason: UseCaseClaimRejectionReason;

    readonly existingIntentId?: string;

    constructor(executionId: ExecutionId, reason: 'already-in-progress');
    constructor(executionId: ExecutionId, reason: 'intent-conflict', existingIntentId: string);
    constructor(
        executionId: ExecutionId,
        reason: UseCaseClaimRejectionReason,
        existingIntentId?: string,
    ) {
        const { retryable, message } = DETAILS[reason];

        super({ code: reason, message: message(executionId), retryable });

        this.executionId = executionId;
        this.reason = reason;
        this.existingIntentId = existingIntentId;
    }
}

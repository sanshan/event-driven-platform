import type { ExecutionId } from '@event-driven-platform/execution';
import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ExecutionClaimRejectionReason = 'already-in-progress' | 'intent-conflict';

/**
 * "already-in-progress" is retryable: the owning attempt is expected to
 * finish or its lease to expire on its own. "intent-conflict" is a
 * structural mismatch between the claimed execution and the persisted
 * Operation that retrying the same claim cannot resolve.
 */
const DETAILS: Record<
    ExecutionClaimRejectionReason,
    { readonly retryable: boolean; readonly message: (executionId: ExecutionId) => string }
> = {
    'already-in-progress': {
        retryable: true,
        message: (executionId) => `Execution "${executionId}" is already in progress.`,
    },
    'intent-conflict': {
        retryable: false,
        message: (executionId) => `Execution "${executionId}" conflicts with the persisted Operation.`,
    },
};

export class ExecutionClaimRejectedError extends ExecutionFailureError {
    constructor(
        readonly executionId: ExecutionId,
        readonly reason: ExecutionClaimRejectionReason,
    ) {
        const { retryable, message } = DETAILS[reason];

        super({ code: reason, message: message(executionId), retryable });
    }
}

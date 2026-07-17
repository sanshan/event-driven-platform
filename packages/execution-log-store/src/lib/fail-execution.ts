import type {
    ExecutionAttemptId,
    ExecutionFailure,
    ExecutionId,
} from '@event-driven-platform/execution';
import type { FailedExecutionLogEntry } from '@event-driven-platform/execution-log';
import type { AnyOperation } from '@event-driven-platform/operation';

import type { ExecutionLeaseReference } from './execution-lease-reference.js';
import type { ExecutionTransitionRejected } from './execution-transition-result.js';

export type FailedExecutionAttemptStatus = 'failed' | 'timed-out';

/**
 * Requests atomic failure of the active execution attempt.
 *
 * This is used only for infrastructure execution failures.
 */
export interface FailExecutionRequest {
    readonly executionId: ExecutionId;

    readonly attemptId: ExecutionAttemptId;

    readonly lease: ExecutionLeaseReference;

    readonly status: FailedExecutionAttemptStatus;

    readonly failure: ExecutionFailure;

    readonly finishedAt: string;
}

export interface ExecutionFailed<TOperation extends AnyOperation> {
    readonly type: 'failed';

    readonly entry: FailedExecutionLogEntry<TOperation>;
}

export type FailExecutionResult<TOperation extends AnyOperation> =
    ExecutionFailed<TOperation> | ExecutionTransitionRejected<TOperation>;

import type { ExecutionAttemptId, ExecutionId } from '@event-driven-platform/execution';
import type { CompletedExecutionLogEntry } from '@event-driven-platform/execution-log';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

import type { ExecutionLeaseReference } from './execution-lease-reference.js';
import type { ExecutionTransitionRejected } from './execution-transition-result.js';

/**
 * Requests atomic successful completion of the active attempt.
 *
 * Business rejections are valid OperationResult values and therefore
 * are persisted through complete(), not fail().
 */
export interface CompleteExecutionRequest<TOperation extends AnyOperation> {
    readonly executionId: ExecutionId;

    readonly attemptId: ExecutionAttemptId;

    readonly lease: ExecutionLeaseReference;

    readonly result: OperationResultOf<TOperation>;

    readonly finishedAt: string;
}

export interface ExecutionCompleted<TOperation extends AnyOperation> {
    readonly type: 'completed';

    readonly entry: CompletedExecutionLogEntry<TOperation>;
}

export type CompleteExecutionResult<TOperation extends AnyOperation> =
    ExecutionCompleted<TOperation> | ExecutionTransitionRejected<TOperation>;

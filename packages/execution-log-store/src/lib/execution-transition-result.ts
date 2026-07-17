import type {
    AnyExecutionLogEntry,
    InProgressExecutionLogEntry,
} from '@event-driven-platform/execution-log';
import type { AnyOperation } from '@event-driven-platform/operation';

/**
 * No Execution Log entry exists for the supplied ExecutionId.
 */
export interface ExecutionNotFound {
    readonly type: 'not-found';
}

/**
 * The Execution exists but its latest attempt is not in progress.
 */
export interface ExecutionNotInProgress {
    readonly type: 'not-in-progress';

    readonly entry: AnyExecutionLogEntry;
}

/**
 * The supplied lease owner or lease version does not match
 * the currently active lease.
 */
export interface ExecutionLeaseConflict<TOperation extends AnyOperation> {
    readonly type: 'lease-conflict';

    readonly entry: InProgressExecutionLogEntry<TOperation>;
}

export type ExecutionTransitionRejected<TOperation extends AnyOperation> =
    ExecutionNotFound | ExecutionNotInProgress | ExecutionLeaseConflict<TOperation>;

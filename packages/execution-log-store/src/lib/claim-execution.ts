import type { ExecutionId, ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import type {
    AnyExecutionLogEntry,
    CompletedExecutionLogEntry,
    InProgressExecutionLogEntry,
} from '@event-driven-platform/execution-log';
import type { AnyOperation } from '@event-driven-platform/operation';

/**
 * Requests atomic ownership of an Operation execution.
 *
 * The store derives the Intent identifier from:
 *
 * request.operation.intent.id
 *
 * The store atomically assigns:
 *
 * - attempt number
 * - attempt identifier
 * - lease version
 * - lease acquisition timestamp
 * - lease expiration timestamp
 */
export interface ClaimExecutionRequest<TOperation extends AnyOperation> {
    readonly executionId: ExecutionId;

    readonly operation: TOperation;

    readonly correlationId: string;

    readonly leaseOwnerId: ExecutionLeaseOwnerId;

    readonly leaseDurationMs: number;

    readonly requestedAt: string;
}

/**
 * A new execution attempt was created and claimed successfully.
 *
 * The returned entry contains the attempt and lease values assigned
 * atomically by the store.
 */
export interface ExecutionClaimed<TOperation extends AnyOperation> {
    readonly type: 'claimed';

    readonly entry: InProgressExecutionLogEntry<TOperation>;
}

/**
 * The Intent has already produced a final OperationResult.
 *
 * The stored result must be returned without executing the
 * Operation again.
 */
export interface CompletedExecutionFound<TOperation extends AnyOperation> {
    readonly type: 'completed';

    readonly entry: CompletedExecutionLogEntry<TOperation>;
}

/**
 * Another Runner currently owns a valid execution lease.
 */
export interface ExecutionAlreadyInProgress<TOperation extends AnyOperation> {
    readonly type: 'already-in-progress';

    readonly entry: InProgressExecutionLogEntry<TOperation>;
}

/**
 * The Intent identifier already belongs to a different persisted
 * Operation snapshot.
 *
 * This protects idempotency from accidental Intent reuse.
 */
export interface ExecutionIntentConflict {
    readonly type: 'intent-conflict';

    readonly entry: AnyExecutionLogEntry;
}

export type ClaimExecutionResult<TOperation extends AnyOperation> =
    | ExecutionClaimed<TOperation>
    | CompletedExecutionFound<TOperation>
    | ExecutionAlreadyInProgress<TOperation>
    | ExecutionIntentConflict;

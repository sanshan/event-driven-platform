import type { AnyExecutionLogEntry } from '@event-driven-platform/execution-log';
import type { AnyOperation } from '@event-driven-platform/operation';

import type { ClaimExecutionRequest, ClaimExecutionResult } from './claim-execution.js';
import type { CompleteExecutionRequest, CompleteExecutionResult } from './complete-execution.js';
import type { FailExecutionRequest, FailExecutionResult } from './fail-execution.js';

/**
 * Infrastructure port for durable and atomic Execution Log transitions.
 *
 * Implementations must preserve the atomicity and concurrency guarantees
 * described by each operation.
 */
export interface ExecutionLogStore {
    claim<TOperation extends AnyOperation>(
        request: ClaimExecutionRequest<TOperation>,
    ): Promise<ClaimExecutionResult<TOperation>>;

    complete<TOperation extends AnyOperation>(
        request: CompleteExecutionRequest<TOperation>,
    ): Promise<CompleteExecutionResult<TOperation>>;

    fail<TOperation extends AnyOperation>(
        request: FailExecutionRequest,
    ): Promise<FailExecutionResult<TOperation>>;

    findByIntentId(intentId: string): Promise<AnyExecutionLogEntry | null>;
}

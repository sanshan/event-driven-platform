import type { InProgressExecutionLogEntry } from '@event-driven-platform/execution-log';
import type { AnyOperation } from '@event-driven-platform/operation';

import type { RunnerExecution } from '../runner/runner-execution.js';

export interface FailedHandlerAttempt<TOperation extends AnyOperation> {
    readonly type: 'failed';
    readonly entry: InProgressExecutionLogEntry<TOperation>;
    readonly error: unknown;
    readonly failureRecorded: boolean;
}

export interface CompletedHandlerAttempt<TOperation extends AnyOperation> {
    readonly type: 'completed';
    readonly execution: RunnerExecution<TOperation>;
}

export type HandlerAttemptOutcome<TOperation extends AnyOperation> =
    | FailedHandlerAttempt<TOperation>
    | CompletedHandlerAttempt<TOperation>;

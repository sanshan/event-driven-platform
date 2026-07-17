import type { ExecutionId, ExecutionLease } from '@event-driven-platform/execution';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

import type {
    CompletedExecutionAttempt,
    FailedExecutionAttempt,
    InProgressExecutionAttempt,
    TimedOutExecutionAttempt,
} from './execution-attempt.js';

interface ExecutionLogEntryBase<TOperation extends AnyOperation> {
    readonly executionId: ExecutionId;

    readonly intentId: string;

    readonly operation: TOperation;

    readonly attemptCount: number;

    readonly createdAt: string;
}

export interface InProgressExecutionLogEntry<
    TOperation extends AnyOperation,
> extends ExecutionLogEntryBase<TOperation> {
    readonly latestAttempt: InProgressExecutionAttempt;

    readonly lease: ExecutionLease;

    readonly result: null;

    readonly finishedAt: null;
}

export interface CompletedExecutionLogEntry<
    TOperation extends AnyOperation,
> extends ExecutionLogEntryBase<TOperation> {
    readonly latestAttempt: CompletedExecutionAttempt;

    readonly lease: null;

    readonly result: OperationResultOf<TOperation>;

    readonly finishedAt: string;
}

export interface FailedExecutionLogEntry<
    TOperation extends AnyOperation,
> extends ExecutionLogEntryBase<TOperation> {
    readonly latestAttempt: FailedExecutionAttempt | TimedOutExecutionAttempt;

    readonly lease: null;

    readonly result: null;

    readonly finishedAt: string;
}

export type ExecutionLogEntry<TOperation extends AnyOperation> =
    | InProgressExecutionLogEntry<TOperation>
    | CompletedExecutionLogEntry<TOperation>
    | FailedExecutionLogEntry<TOperation>;

export type AnyExecutionLogEntry = ExecutionLogEntry<AnyOperation>;

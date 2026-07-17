import type { AnyOperation } from '@event-driven-platform/operation';

import type {
    CompletedExecutionLogEntry,
    ExecutionLogEntry,
    FailedExecutionLogEntry,
    InProgressExecutionLogEntry,
} from './execution-log-entry.js';

export function isInProgressExecutionLogEntry<TOperation extends AnyOperation>(
    entry: ExecutionLogEntry<TOperation>,
): entry is InProgressExecutionLogEntry<TOperation> {
    return entry.latestAttempt.status === 'in-progress';
}

export function isCompletedExecutionLogEntry<TOperation extends AnyOperation>(
    entry: ExecutionLogEntry<TOperation>,
): entry is CompletedExecutionLogEntry<TOperation> {
    return entry.latestAttempt.status === 'completed';
}

export function isFailedExecutionLogEntry<TOperation extends AnyOperation>(
    entry: ExecutionLogEntry<TOperation>,
): entry is FailedExecutionLogEntry<TOperation> {
    return entry.latestAttempt.status === 'failed' || entry.latestAttempt.status === 'timed-out';
}

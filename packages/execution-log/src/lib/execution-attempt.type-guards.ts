import type {
    CompletedExecutionAttempt,
    ExecutionAttempt,
    FailedExecutionAttempt,
    InProgressExecutionAttempt,
    TimedOutExecutionAttempt,
} from './execution-attempt.js';

export function isInProgressExecutionAttempt(
    attempt: ExecutionAttempt,
): attempt is InProgressExecutionAttempt {
    return attempt.status === 'in-progress';
}

export function isCompletedExecutionAttempt(
    attempt: ExecutionAttempt,
): attempt is CompletedExecutionAttempt {
    return attempt.status === 'completed';
}

export function isFailedExecutionAttempt(
    attempt: ExecutionAttempt,
): attempt is FailedExecutionAttempt {
    return attempt.status === 'failed';
}

export function isTimedOutExecutionAttempt(
    attempt: ExecutionAttempt,
): attempt is TimedOutExecutionAttempt {
    return attempt.status === 'timed-out';
}

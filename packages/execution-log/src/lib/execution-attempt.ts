import type {
    ExecutionAttemptId,
    ExecutionFailure,
    ExecutionId,
    ExecutionLeaseOwnerId,
    ExecutionLeaseVersion,
} from '@event-driven-platform/execution';

interface ExecutionAttemptBase {
    readonly attemptId: ExecutionAttemptId;

    readonly executionId: ExecutionId;

    readonly attemptNumber: number;

    readonly correlationId: string;

    readonly runnerId: ExecutionLeaseOwnerId;

    readonly leaseVersion: ExecutionLeaseVersion;

    readonly startedAt: string;
}

export interface InProgressExecutionAttempt extends ExecutionAttemptBase {
    readonly status: 'in-progress';

    readonly failure: null;

    readonly finishedAt: null;
}

export interface CompletedExecutionAttempt extends ExecutionAttemptBase {
    readonly status: 'completed';

    readonly failure: null;

    readonly finishedAt: string;
}

export interface FailedExecutionAttempt extends ExecutionAttemptBase {
    readonly status: 'failed';

    readonly failure: ExecutionFailure;

    readonly finishedAt: string;
}

export interface TimedOutExecutionAttempt extends ExecutionAttemptBase {
    readonly status: 'timed-out';

    readonly failure: ExecutionFailure;

    readonly finishedAt: string;
}

export type ExecutionAttempt =
    | InProgressExecutionAttempt
    | CompletedExecutionAttempt
    | FailedExecutionAttempt
    | TimedOutExecutionAttempt;

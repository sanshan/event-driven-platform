import type { ExecutionId } from '@event-driven-platform/execution';
import type { UseCaseExecutionTransitionRejected } from '@event-driven-platform/use-case-execution-store';

export class UseCaseAlreadyInProgressError extends Error {
    public constructor(readonly executionId: ExecutionId) {
        super(`UseCase execution ${executionId} is already in progress.`);
        this.name = 'UseCaseAlreadyInProgressError';
    }
}

export class UseCaseIntentConflictError extends Error {
    public constructor(
        readonly executionId: ExecutionId,
        readonly existingIntentId: string,
    ) {
        super(`UseCase execution ${executionId} is associated with another Intent.`);
        this.name = 'UseCaseIntentConflictError';
    }
}

export class UseCaseExecutionTransitionError extends Error {
    public constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete',
        readonly rejection: UseCaseExecutionTransitionRejected,
    ) {
        super(
            `UseCase execution ${executionId} ${transition} transition was rejected: ${rejection.type}.`,
        );
        this.name = 'UseCaseExecutionTransitionError';
    }
}

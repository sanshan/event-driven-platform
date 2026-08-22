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

export class UseCaseExecutionOwnershipLostError extends Error {
    public constructor(readonly executionId: ExecutionId) {
        super(`UseCase execution ${executionId} ownership was lost or could not be confirmed.`);
        this.name = 'UseCaseExecutionOwnershipLostError';
    }
}

export class UseCaseExecutorConfigurationError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'UseCaseExecutorConfigurationError';
    }
}

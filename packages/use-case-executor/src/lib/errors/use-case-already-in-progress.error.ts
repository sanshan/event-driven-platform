import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';

export class UseCaseAlreadyInProgressError extends ExecutionError {
    public constructor(readonly executionId: ExecutionId) {
        super({
            code: 'use-case-already-in-progress',
            message: `UseCase execution ${executionId} is already in progress.`,
            classification: 'conflict',
            retry: 'caller',
            retryable: false,
        });
    }
}

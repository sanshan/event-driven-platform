import type { ExecutionId } from '@event-driven-platform/execution';

export class UseCaseAlreadyInProgressError extends Error {
    public constructor(readonly executionId: ExecutionId) {
        super(`UseCase execution ${executionId} is already in progress.`);
        this.name = 'UseCaseAlreadyInProgressError';
    }
}

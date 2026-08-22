import type { ExecutionId } from '@event-driven-platform/execution';

export class UseCaseIntentConflictError extends Error {
    public constructor(
        readonly executionId: ExecutionId,
        readonly existingIntentId: string,
    ) {
        super(`UseCase execution ${executionId} is associated with another Intent.`);
        this.name = 'UseCaseIntentConflictError';
    }
}

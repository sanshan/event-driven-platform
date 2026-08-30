import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';

export class UseCaseIntentConflictError extends ExecutionError {
    public constructor(
        readonly executionId: ExecutionId,
        readonly existingIntentId: string,
    ) {
        super({
            code: 'use-case-intent-conflict',
            message: `UseCase execution ${executionId} is associated with another Intent.`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
    }
}

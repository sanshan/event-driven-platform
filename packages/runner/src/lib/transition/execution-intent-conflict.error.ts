import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';

export class ExecutionIntentConflictError extends ExecutionError {
    constructor(readonly executionId: ExecutionId) {
        super({
            code: 'execution-intent-conflict',
            message: `Execution "${executionId}" conflicts with the persisted Operation.`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
    }
}

import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';

export class ExecutionAlreadyInProgressError extends ExecutionError {
    constructor(readonly executionId: ExecutionId) {
        super({
            code: 'execution-already-in-progress',
            message: `Execution "${executionId}" is already in progress.`,
            classification: 'conflict',
            retry: 'caller',
            retryable: false,
        });
    }
}

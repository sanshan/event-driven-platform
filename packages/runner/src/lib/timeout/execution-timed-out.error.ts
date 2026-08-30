import { ExecutionFailureError } from '@event-driven-platform/execution';

export class ExecutionTimedOutError extends ExecutionFailureError {
    constructor(readonly timeoutMs: number) {
        super({
            code: 'execution-timed-out',
            message: `Execution attempt timed out after ${timeoutMs} ms.`,
            retryable: true,
        });
    }
}

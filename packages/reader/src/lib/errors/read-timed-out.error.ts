import { ExecutionFailureError } from '@event-driven-platform/execution';

export class ReadTimedOutError extends ExecutionFailureError {
    constructor(readonly timeoutMs: number) {
        super({
            code: 'read-timed-out',
            message: `Read execution timed out after ${timeoutMs}ms.`,
            retryable: true,
        });
    }
}

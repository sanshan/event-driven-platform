import { ExecutionError } from '@event-driven-platform/execution';

export class ReadTimedOutError extends ExecutionError {
    constructor(readonly timeoutMs: number) {
        super({
            code: 'read-timed-out',
            message: `Read execution timed out after ${timeoutMs}ms.`,
            classification: 'timeout',
            retry: 'caller',
            retryable: false,
        });
    }
}

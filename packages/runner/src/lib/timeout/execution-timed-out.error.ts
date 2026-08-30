import { ExecutionError } from '@event-driven-platform/execution';

export class ExecutionTimedOutError extends ExecutionError {
    constructor(readonly timeoutMs: number) {
        const message = `Execution attempt timed out after ${timeoutMs} ms.`;

        super({
            code: 'execution-timed-out',
            message,
            classification: 'timeout',
            retry: 'current-execution',
            retryable: true,
        });
    }
}

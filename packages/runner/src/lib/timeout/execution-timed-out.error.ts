import type { ExecutionFailure } from '@event-driven-platform/execution';

export class ExecutionTimedOutError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor(readonly timeoutMs: number) {
        const message = `Execution attempt timed out after ${timeoutMs} ms.`;

        super(message);

        this.name = 'ExecutionTimedOutError';
        this.executionFailure = {
            code: 'execution-timed-out',
            message,
            retryable: true,
        };
    }
}

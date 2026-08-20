import type { ExecutionTimeoutResult } from './execution-timeout-result.js';

export interface ExecutionTimeout {
    execute<TResult>(
        work: () => Promise<TResult>,
        timeoutMs: number,
    ): Promise<ExecutionTimeoutResult<TResult>>;
}

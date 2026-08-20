import type { ExecutionTimeoutResult } from './execution-timeout-result.js';
import type { ExecutionTimeout } from './execution-timeout.js';

export class DefaultExecutionTimeout implements ExecutionTimeout {
    execute<TResult>(
        work: () => Promise<TResult>,
        timeoutMs: number,
    ): Promise<ExecutionTimeoutResult<TResult>> {
        return new Promise<ExecutionTimeoutResult<TResult>>((resolve, reject) => {
            let settled = false;

            const timeout = setTimeout(() => {
                if (settled) {
                    return;
                }

                settled = true;
                resolve({
                    type: 'timed-out',
                });
            }, timeoutMs);

            void work().then(
                (result) => {
                    if (settled) {
                        return;
                    }

                    settled = true;
                    clearTimeout(timeout);
                    resolve({
                        type: 'completed',
                        result,
                    });
                },
                (error: unknown) => {
                    if (settled) {
                        return;
                    }

                    settled = true;
                    clearTimeout(timeout);
                    reject(error);
                },
            );
        });
    }
}

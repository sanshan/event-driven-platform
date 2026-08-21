import type { ReadTimeout, ReadTimeoutResult } from './read-timeout.js';

export class DefaultReadTimeout implements ReadTimeout {
    execute<TResult>(
        work: () => Promise<TResult>,
        timeoutMs: number,
    ): Promise<ReadTimeoutResult<TResult>> {
        return new Promise<ReadTimeoutResult<TResult>>((resolve, reject) => {
            let settled = false;

            const timeout = setTimeout(() => {
                if (settled) {
                    return;
                }

                settled = true;
                resolve({ type: 'timed-out' });
            }, timeoutMs);

            void work().then(
                (result) => {
                    if (settled) {
                        return;
                    }

                    settled = true;
                    clearTimeout(timeout);
                    resolve({ type: 'completed', result });
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

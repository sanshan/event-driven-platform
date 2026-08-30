import { normalizeExecutionFailure } from '@event-driven-platform/execution';
import type { QueryOptions } from '@event-driven-platform/query';

import { calculateRetryDelay } from './calculate-retry-delay.js';
import type { RetryDelay } from './retry-delay.js';

type RetryOptions = NonNullable<QueryOptions['retry']>;

/**
 * Retries only the wrapped work — the source-executor invocation.
 * Callers must not wrap cache traversal, single-flight coordination,
 * or distributed-coordination logic with this: those already have
 * their own recovery paths, and wrapping them here would risk
 * double-retrying an already-orphaned attempt.
 */
export async function executeReadWithRetry<TResult>(
    work: () => Promise<TResult>,
    retry: RetryOptions | undefined,
    retryDelay: RetryDelay,
): Promise<TResult> {
    let attempt = 1;

    for (;;) {
        try {
            return await work();
        } catch (error: unknown) {
            const failure = normalizeExecutionFailure(error);
            const canRetry = retry !== undefined && failure.retryable && attempt < retry.maxAttempts;

            if (!canRetry) {
                throw error;
            }

            const delayMs = calculateRetryDelay(retry.strategy, attempt);

            if (delayMs > 0) {
                await retryDelay.wait(delayMs);
            }

            attempt += 1;
        }
    }
}

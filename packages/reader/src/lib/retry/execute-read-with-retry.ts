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
 *
 * When wrapped inside a distributed-flight owner's executeSource
 * callback, this loop has no visibility into lease-ownership state:
 * if the lease is lost mid-retry-sequence, ownership loss is only
 * detected once this whole call resolves, not between attempts. This
 * widens (vs. a single un-retried call) the window in which a doomed
 * owner keeps hitting the source before its result is discarded — an
 * accepted trade-off (still fail-safe: the result is never returned
 * or published once ownership is lost), not a data-integrity risk.
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

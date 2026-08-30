import type { Clock } from '@event-driven-platform/clock';
import { normalizeExecutionFailure } from '@event-driven-platform/execution';
import type { ReaderObservationContext, ReaderObserver } from '@event-driven-platform/observability';
import type { QueryOptions } from '@event-driven-platform/query';

import { calculateRetryDelay } from './calculate-retry-delay.js';
import type { RetryDelay } from './retry-delay.js';

type RetryOptions = NonNullable<QueryOptions['retry']>;

export interface ExecuteReadWithRetryDependencies {
    readonly retryDelay: RetryDelay;
    readonly observer: ReaderObserver;
    readonly clock: Clock;
}

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
 * Tracked as future work in issue #188; also see #187, which tracks
 * threading cancellation into the read-handler contract more broadly.
 */
export async function executeReadWithRetry<TResult>(
    work: () => Promise<TResult>,
    retry: RetryOptions | undefined,
    context: ReaderObservationContext,
    dependencies: ExecuteReadWithRetryDependencies,
): Promise<TResult> {
    let attempt = 1;

    for (;;) {
        const attemptStartedAt = dependencies.clock.now();

        dependencies.observer.observe({ type: 'read.attempt.started', context, attempt });

        try {
            const result = await work();

            dependencies.observer.observe({
                type: 'read.attempt.completed',
                context,
                attempt,
                outcome: 'success',
                retryable: false,
                durationMs: durationSince(dependencies.clock, attemptStartedAt),
            });

            return result;
        } catch (error: unknown) {
            const failure = normalizeExecutionFailure(error);

            dependencies.observer.observe({
                type: 'read.attempt.completed',
                context,
                attempt,
                outcome: 'error',
                retryable: failure.retryable,
                durationMs: durationSince(dependencies.clock, attemptStartedAt),
            });

            const canRetry = retry !== undefined && failure.retryable && attempt < retry.maxAttempts;

            if (!canRetry) {
                throw error;
            }

            const delayMs = calculateRetryDelay(retry.strategy, attempt);

            dependencies.observer.observe({
                type: 'read.retry.scheduled',
                context,
                attempt,
                delayMs,
            });

            if (delayMs > 0) {
                await dependencies.retryDelay.wait(delayMs);
            }

            attempt += 1;
        }
    }
}

function durationSince(clock: Clock, startedAt: string): number {
    return Math.max(0, Date.parse(clock.now()) - Date.parse(startedAt));
}

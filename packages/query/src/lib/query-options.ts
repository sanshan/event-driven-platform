import type { RetryOptions } from '@event-driven-platform/retry';

import type { QueryCachePlan } from './query-cache-plan.js';

export interface QueryOptions<TResult = unknown> {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
    readonly cache?: QueryCachePlan<TResult>;

    /**
     * Retry policy applied only to the source-executor
     * invocation. Does not retry cache traversal, single-flight
     * coordination, or distributed-coordination failures — those
     * have their own recovery paths.
     */
    readonly retry?: RetryOptions;
}

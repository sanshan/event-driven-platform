import type { QueryCachePlan } from './query-cache-plan.js';

export interface QueryOptions<TResult = unknown> {
    readonly timeoutMs?: number;
    readonly cache?: QueryCachePlan<TResult>;
}

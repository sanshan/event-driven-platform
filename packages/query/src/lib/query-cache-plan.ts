import type { QueryCacheLevel } from './query-cache-level.js';
import type { QueryReadCoordinationOptions } from './query-read-coordination-options.js';
import type { ReadCacheKey } from './read-cache-key.js';

export type QueryCacheLevels<TResult> = readonly [
    QueryCacheLevel<TResult>,
    ...QueryCacheLevel<TResult>[],
];

export interface QueryCachePlan<TResult> {
    readonly key: ReadCacheKey;
    readonly levels: QueryCacheLevels<TResult>;
    readonly coordination?: QueryReadCoordinationOptions;
}

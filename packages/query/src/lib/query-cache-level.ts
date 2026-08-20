import type { CacheReader } from './cache-reader.js';
import type { CacheScope } from './cache-scope.js';
import type { CacheWriter } from './cache-writer.js';

export interface QueryCacheLevel<TResult> {
    readonly scope: CacheScope;
    readonly reader: CacheReader<TResult>;
    readonly writer?: CacheWriter<TResult>;
}

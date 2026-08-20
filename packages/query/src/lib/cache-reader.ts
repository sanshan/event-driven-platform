import type { CacheReadResult } from './cache-read-result.js';
import type { ReadCacheKey } from './read-cache-key.js';

export interface CacheReader<TResult> {
    readonly read: (key: ReadCacheKey) => Promise<CacheReadResult<TResult>>;
}

import type { ReadCacheKey } from './read-cache-key.js';

export interface CacheWriter<TResult> {
    readonly write: (key: ReadCacheKey, value: TResult) => Promise<void>;
}

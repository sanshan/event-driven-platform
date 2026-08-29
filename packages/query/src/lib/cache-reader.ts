import type { CacheReadResult } from './cache-read-result.js';
import type { TenantScopedReadCacheKey } from './tenant-scoped-read-cache-key.js';

export interface CacheReader<TResult> {
    readonly read: (key: TenantScopedReadCacheKey) => Promise<CacheReadResult<TResult>>;
}

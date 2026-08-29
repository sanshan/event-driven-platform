import type { TenantScopedReadCacheKey } from './tenant-scoped-read-cache-key.js';

export interface CacheWriter<TResult> {
    readonly write: (key: TenantScopedReadCacheKey, value: TResult) => Promise<void>;
}

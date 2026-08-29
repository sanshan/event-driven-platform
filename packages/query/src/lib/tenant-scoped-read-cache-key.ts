import type { AnyRead } from '@event-driven-platform/read';

import type { ReadCacheKey } from './read-cache-key.js';

export interface TenantScopedReadCacheKey {
    readonly tenant: AnyRead['tenant'];
    readonly key: ReadCacheKey;
}

# @event-driven-platform/read-cache-redis

Shared Redis-backed cache adapter for the stable Read pipeline.

The package provides separate `CacheReader<TResult>` and `CacheWriter<TResult>` implementations for cache levels declared with `scope: 'shared'`. It contains no distributed lease/ownership or Reader orchestration logic.

## Usage

```ts
import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    RedisReadCacheReader,
    RedisReadCacheWriter,
} from '@event-driven-platform/read-cache-redis';

const codec = createJsonReadCacheCodec<UserView>();
const ttlPolicy = createRedisReadCacheTtlPolicy({
    ttlMs: 120_000,
    jitterRatio: 0.1,
});

const l2Reader = new RedisReadCacheReader<UserView>({
    client,
    codec,
});

const l2Writer = new RedisReadCacheWriter<UserView>({
    client,
    codec,
    ttlPolicy,
});

const level = {
    scope: 'shared' as const,
    reader: l2Reader,
    writer: l2Writer,
};
```

The Redis command client is supplied and owned by the consumer.

## Behavior

The adapter reads and writes `TenantScopedReadCacheKey` values supplied by Reader. Tenant scope is added by the adapter itself before the Redis command is issued, so different tenants cannot share a physical Redis cache key even when a custom logical key encoder is configured.

`RedisReadCacheKeyEncoder` remains responsible only for encoding the logical `ReadCacheKey`. Consumers may customize that logical encoding, but cannot replace or remove the tenant prefix applied by the adapter.

The adapter also provides explicit serialization through `ReadCacheCodec`, separate reader/writer capabilities, TTL policy, optional expiry jitter, cache miss/error distinction, and real Redis integration coverage.

Consumers may provide a custom `RedisReadCacheKeyEncoder`, codec, or `RedisReadCacheTtlPolicy`. `createJsonReadCacheCodec()` and `createRedisReadCacheTtlPolicy()` provide standard implementations.

A shared cache can act as the result rendezvous between Reader instances during distributed coordination, but this adapter never claims ownership or waits for flights itself.

## Related documentation

- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)

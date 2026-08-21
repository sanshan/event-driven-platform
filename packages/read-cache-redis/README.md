# @event-driven-platform/read-cache-redis

Shared Redis-backed cache capabilities for the Read pipeline.

The package provides separate `CacheReader<TResult>` and `CacheWriter<TResult>` implementations for `scope: 'shared'` cache levels. It uses the same supported Redis client family as the distributed read coordinator but contains no lease, ownership, Reader traversal, promotion, backfill, retry, or in-flight logic.

The adapter provides:

- explicit key namespacing from `ReadCacheKey`;
- separate reader and writer capabilities;
- explicit serialization/deserialization through a codec;
- configurable TTL in milliseconds;
- configurable expiry jitter through an injected random source;
- miss/error distinction through the Query cache-read contract;
- real Redis integration coverage.

Example:

```ts
const codec = createJsonReadCacheCodec<UserView>();

const reader = new RedisReadCacheReader({ client, codec });
const writer = new RedisReadCacheWriter({
    client,
    codec,
    ttlMs: 120_000,
    jitterRatio: 0.1,
});

const level = {
    scope: 'shared' as const,
    reader,
    writer,
};
```

A shared cache carries values between Reader instances during distributed rendezvous, but the adapter itself never participates in coordination.

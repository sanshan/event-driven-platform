# @event-driven-platform/read-cache-in-memory

Process-local cache capabilities for the Read pipeline.

`InMemoryReadCache<TResult>` implements the technology-neutral `CacheReader<TResult>` and `CacheWriter<TResult>` contracts from `@event-driven-platform/query`. It is intended for `scope: 'local'` cache levels composed by `Reader`.

The adapter provides:

- explicit positive capacity;
- bounded oldest-entry eviction;
- per-entry TTL;
- lazy expiry without background timers;
- deterministic clock injection for tests;
- no Reader traversal, promotion, backfill, retry, or in-flight behavior.

Example:

```ts
const cache = new InMemoryReadCache<UserView>({
    capacity: 10_000,
    ttlMs: 30_000,
});

const level = {
    scope: 'local' as const,
    reader: cache,
    writer: cache,
};
```

The cache is disposable process-local state. Correctness must not depend on instance affinity or cache survival.

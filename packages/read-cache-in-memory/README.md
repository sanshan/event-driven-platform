# @event-driven-platform/read-cache-in-memory

Process-local cache adapter for the stable Read pipeline.

`InMemoryReadCache<TResult>` implements the technology-neutral `CacheReader<TResult>` and `CacheWriter<TResult>` contracts from `@event-driven-platform/query`. It is intended for cache levels declared with `scope: 'local'`.

## Usage

```ts
import { InMemoryReadCache } from '@event-driven-platform/read-cache-in-memory';

const l1 = new InMemoryReadCache<UserView>({
    capacity: 10_000,
    ttlMs: 30_000,
});

const level = {
    scope: 'local' as const,
    reader: l1,
    writer: l1,
};
```

## Behavior

The adapter provides positive bounded capacity, oldest-entry eviction, per-entry TTL, lazy expiry without background timers, and injectable clock behavior for deterministic testing.

It contains no Reader traversal, promotion, backfill, coordination, retry, or in-flight orchestration. Reader decides when the adapter is read and when successful values are written.

The cache is disposable process-local state. Correctness must not depend on instance affinity or cache survival.

## Related documentation

- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)

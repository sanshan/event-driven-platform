# @event-driven-platform/read-execution-coordinator-redis

> **Status: Draft / internal.** This package is not yet part of the supported public package boundary.

Redis implementation of `@event-driven-platform/read-execution-coordinator`.

## Role

This package implements transient cross-instance read-execution ownership. It does not execute Reads, transport read results, write application caches, or persist durable read execution history.

## Ownership model

Each effective `ReadCacheKey` maps only to transient coordination state:

- a lease key with bounded Redis TTL;
- a release notification channel used only to wake followers.

The adapter namespace also owns one global monotonic generation counter. This is fixed-cardinality sequencing metadata: it contains no read identity, read result or execution history. Using one counter avoids creating an immortal Redis key for every distinct read identity while still ensuring that reclaimed ownership receives a strictly newer generation.

Claim is atomic in Redis. If no active lease exists, Redis increments the global generation and installs the per-read lease with `PSETEX` in one Lua script. The returned lease reference contains the caller `ownerId` and Redis-issued generation.

Renewal and release use atomic compare-and-mutate Lua scripts. Both compare the complete serialized lease reference before extending or deleting the lease. A stale owner therefore cannot renew or delete a lease created by a later generation.

All high-cardinality per-read stored state is TTL-bounded. Pub/Sub channels themselves persist no Redis data.

## Follower waiting

Followers use Redis Pub/Sub rather than busy polling. The adapter owns one duplicated subscriber connection, because node-redis subscriptions require a dedicated connection under RESP2.

The wait algorithm performs a cache-independent double check around subscription:

```text
lease EXISTS?
-> if absent: released
-> subscribe release channel
-> lease EXISTS again
-> if absent: released
-> otherwise await release notification / timeout / cancellation
```

The second existence check closes the lost-wakeup race where release happens while the subscription is being established.

Release publishes only after an ownership-checked delete succeeds. A stale owner cannot wake followers by releasing another owner's lease.

Lease expiry itself does not publish. A follower whose wait budget expires returns `timed-out`; Reader integration decides when to re-check shared cache and re-contend. This package does not perform Reader orchestration.

## Availability semantics

Redis/client/script failures are translated to the coordinator contract's explicit `unavailable` outcome. This package does not choose Reader's fail-open/fail-closed policy.

## Lifecycle

The command Redis client is supplied by the consumer and remains consumer-owned. `RedisReadExecutionCoordinator` creates one duplicated subscriber connection internally:

- `connect()` connects the subscriber;
- `wait()` also connects it lazily if needed;
- `close()` closes only the internally owned subscriber connection.

## Integration tests

Real Redis verification is a separate Nx target:

```bash
READ_COORDINATOR_REDIS_URL=redis://localhost:6379 \
  pnpm nx run @event-driven-platform/read-execution-coordinator-redis:test:integration
```

The integration target requires `READ_COORDINATOR_REDIS_URL`; it fails rather than silently skipping when no Redis endpoint is supplied. The suite uses multiple independent Redis clients/coordinator instances and covers contention, renewal, expiry/reclaim, stale release, follower wake-up and timeout.

The ordinary `test` target excludes `*.integration.spec.ts`, so normal unit/affected validation does not require Redis.

CI uses the Nx affected project graph to decide whether this adapter needs real Redis verification. When `@event-driven-platform/read-execution-coordinator-redis` is affected directly or through an upstream dependency, CI starts a temporary Redis service and runs `test:integration`. Unrelated changes do not start Redis or pay the integration-test overhead.

The integration target is not Nx-cacheable because it verifies a real external service boundary.

## Current boundary

Reader integration, shared-cache rendezvous behavior, Redis cache adapters, InMemory cache adapters, full observability, load/chaos verification and release-readiness remain separate Epic #72 tasks.

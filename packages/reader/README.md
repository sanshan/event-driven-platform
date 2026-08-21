# @event-driven-platform/reader

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Implements the current Reader execution boundary for the still-incomplete read side.

## Role

`Reader` is the centralized read execution boundary:

```text
Query -> Reader -> cache plan -> ReadHandlerResolver -> ReadHandler -> Result
```

A Query with no cache plan keeps the no-cache behavior introduced by the baseline Reader implementation.

A Query with a cache plan is traversed in the exact level order declared by Query. Reader stops on the first cache hit. If every configured cache level misses or is unavailable, Reader executes the source-handler path.

`DefaultReader` resolves the Read through `ReadHandlerResolver` and executes the first handler in the resolver's deterministic ordered handler set. The current `ReadHandler` contract returns a result directly and has no `miss` outcome, so Reader does not iterate source handlers as fallbacks.

A `not-found` or `ambiguous` resolver outcome is surfaced as an explicit Reader error.

## Cache traversal and population

Cache levels are read from fastest/closest to slowest/farthest:

```text
L1 -> L2 -> ... -> Ln -> source
```

Population runs in the reverse direction and only uses explicit writer capabilities:

```text
source result -> Ln -> ... -> L2 -> L1
```

When a lower cache level hits, Reader promotes the value only into preceding writable levels, again in reverse order.

Cache readers never write caches. ReadHandlers never write caches. Query only carries the plan; Reader owns traversal, promotion and backfill orchestration.

### Cache failure policy

Cache IO is fail-open:

- `miss` continues to the next level;
- a cache reader `{ status: 'error' }` continues to the next level;
- a thrown cache-reader error is treated as an unavailable cache level and traversal continues;
- promotion/backfill writer failures are ignored for result correctness;
- a successful cache hit or source-handler result is never replaced by a cache-write failure;
- source-handler failures are still propagated.

Observability for degraded cache reads/writes belongs to the later Reader observability task.

## Process-local in-flight coalescing

Cached Queries use their deterministic `ReadCacheKey` as the process-local single-flight identity.

Reader first checks the leading `local` cache levels normally. After those levels miss, only one local leader for that key continues into shared cache traversal and source execution. Followers in the same Reader process await the leader's in-flight Promise directly rather than repeating the downstream path.

The local leader re-checks the leading local levels after acquiring the flight. Flights are removed after the underlying downstream Promise settles, whether it succeeds or fails. Different keys use independent flights and remain concurrent.

## Distributed shared-cache rendezvous

A cache plan may opt into distributed coordination with a technology-neutral lease duration:

```text
local cache(s)
-> shared cache(s)
-> distributed claim
   -> leader: shared re-check -> source -> reverse backfill -> release
   -> follower: wait -> shared re-read -> hit or re-claim
```

Distributed coordination is entered only after the configured shared cache levels have missed. A shared cache level is mandatory when distributed coordination is enabled because the coordinator transports no read result.

After acquiring ownership, the leader re-checks shared cache before source execution. This closes the race where another owner filled the shared rendezvous cache while the claim was being acquired.

Followers wait for the current flight with a lease-bounded wait. After every wake or wait timeout they re-read the shared cache. A hit is promoted into preceding writable levels. A miss always re-enters claim contention; a follower never bypasses coordination and runs the source directly.

Healthy ownership is renewed while source/backfill work is active. If ownership is lost before publication, the stale owner does not intentionally publish a new shared result. Release uses the ownership-safe coordinator contract and the lease remains TTL-bounded even if release cannot complete.

Coordinator unavailability is fail-closed for a distributed cache plan: Reader does not bypass the coordinator and create an uncontrolled source herd.

Concrete coordinator technology is supplied through `DefaultReaderDependencies`. Query does not contain Redis or another infrastructure client.

## Timeout and cancellation

`QueryOptions.timeoutMs` bounds the caller's complete Reader wait, including cache traversal, local-flight waiting and distributed wait/source work.

`QueryOptions.signal` allows the caller to stop waiting. Cancellation of one caller does not cancel a process-local/distributed flight shared with other callers. This preserves the single-flight guarantee: one short-lived caller cannot poison the leader or longer-lived followers.

The underlying shared flight remains active until its downstream work settles and performs the normal ownership-safe cleanup/release path.

## Current boundary

Concrete InMemory/Redis cache adapters, TTL/eviction/jitter policy, full observability, broad load/chaos qualification and the final public release boundary remain separate later tasks in the read-pipeline Epic.

Reader contains orchestration only; it does not add business logic and it does not mutate Read or Query.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

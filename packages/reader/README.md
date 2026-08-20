# @event-driven-platform/reader

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Implements the current Reader execution baseline for the incomplete read side.

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

### Failure policy

Cache IO is fail-open in this stage of the Reader pipeline:

- `miss` continues to the next level;
- a cache reader `{ status: 'error' }` continues to the next level;
- a thrown cache-reader error is treated as an unavailable cache level and traversal continues;
- promotion/backfill writer failures are ignored for result correctness;
- a successful cache hit or source-handler result is never replaced by a cache-write failure;
- source-handler failures are still propagated.

Observability for degraded cache reads/writes belongs to the later Reader observability task; the current failure policy is deterministic but intentionally does not add metrics/tracing yet.

## Process-local in-flight coalescing

Cached Queries use their deterministic `ReadCacheKey` as the process-local single-flight identity.

Reader first checks the leading `local` cache levels normally. After those levels miss, only one local leader for that key continues into shared cache traversal and source execution. Followers in the same Reader process await the leader's in-flight Promise directly rather than repeating the downstream path.

The local leader re-checks the leading local levels after acquiring the flight. This preserves the double-check invariant for work that may have been satisfied while requests were racing to become leader.

Flights are removed immediately after the underlying downstream Promise settles, whether it succeeds or fails. There is no durable execution state, lease, fencing token, Redis dependency, or cross-process guarantee in this mechanism.

Different keys use independent flights and remain concurrent.

## Timeout

For a no-cache Query, `QueryOptions.timeoutMs` continues to bound source-handler execution through the `ReadTimeout` capability.

For a cached Query that joins process-local in-flight work, each caller applies its own timeout while awaiting the shared downstream Promise. A short-timeout follower can therefore time out without cancelling or failing the leader or longer-lived followers. The underlying flight remains active until its downstream work settles, preventing a timed-out caller from creating duplicate work while the original request is still running.

The current Query contract does not carry an abort signal, so explicit cancellation propagation is not introduced yet. Distributed wait budgeting and full end-to-end timeout budgeting remain later read-pipeline work.

## Current boundary

Distributed coordination, concrete InMemory/Redis adapters, TTL policy and full observability are not implemented here and remain separate later tasks in the read-pipeline Epic.

Reader contains orchestration only; it does not add business logic and it does not mutate Read or Query.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

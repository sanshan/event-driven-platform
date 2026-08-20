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

## Timeout

`QueryOptions.timeoutMs` currently bounds source-handler execution through the `ReadTimeout` capability. The default implementation reports `ReadTimedOutError` when that timeout expires.

The current Query contract does not carry an abort signal, so cancellation propagation is not introduced by this package yet. Cache IO/wait budget integration belongs to later pipeline work.

## Current boundary

Process-local single-flight, distributed coordination, concrete InMemory/Redis adapters, TTL policy and full observability are not implemented here and remain separate later tasks in the read-pipeline Epic.

Reader contains orchestration only; it does not add business logic and it does not mutate Read or Query.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

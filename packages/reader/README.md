# @event-driven-platform/reader

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Implements the current no-cache Reader execution baseline for the incomplete read side.

## Role

`Reader` is the centralized read execution boundary:

```text
Query -> Reader -> ReadHandlerResolver -> ReadHandler -> Result
```

`DefaultReader` resolves the Read through `ReadHandlerResolver` and executes the first handler in the resolver's deterministic ordered handler set. The current `ReadHandler` contract returns a result directly and has no `miss` outcome, so Reader does not iterate handlers as fallbacks in this baseline.

A `not-found` or `ambiguous` resolver outcome is surfaced as an explicit Reader error.

## Timeout

`QueryOptions.timeoutMs` bounds handler execution through the `ReadTimeout` capability. The default implementation reports `ReadTimedOutError` when the timeout expires.

The current Query contract does not carry an abort signal, so cancellation propagation is not introduced by this package yet.

## Current boundary

Cached Query execution is intentionally rejected. Cache traversal, promotion/backfill and in-flight coordination are not implemented in this package yet and remain part of later read-pipeline work.

Reader contains orchestration only; it does not add business logic and it does not mutate Read or Query.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

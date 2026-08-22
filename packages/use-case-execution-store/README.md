# @event-driven-platform/use-case-execution-store

Defines the technology-neutral durable persistence boundary used to deduplicate and safely recover one logical UseCase invocation.

## Role

The parent UseCase `Intent` is the authoritative logical invocation identity. `ExecutionId` is the durable execution identity derived from that Intent by the Executor. `correlationId` is persisted for traceability only and never creates a new logical invocation.

The store exposes exactly four atomic transitions:

```text
claim -> renewLease -> complete
   \\-> release
```

`claim` returns one of:

- `claimed` — the caller owns a fenced lease and may execute the UseCase;
- `completed` — the exact previously stored final result must be replayed;
- `already-in-progress` — another healthy lease owns the invocation;
- `intent-conflict` — the ExecutionId is already associated with another authoritative Intent identity.

Expired or explicitly released incomplete executions are claimable again. Reclaim must create a newer fenced lease generation. `renewLease`, `complete`, and `release` all require the shared `ExecutionLeaseReference` from `@event-driven-platform/execution`; stale references must be rejected without mutating current state.

`complete` makes successful completion terminal and persists the final typed result. `release` only makes a handled failed invocation immediately claimable again while preserving its Intent association; it is not failure history.

## Explicit boundaries

This package does not implement a database, Redis adapter, in-memory production store, serialization framework, UseCaseExecutor, retry policy, attempts, failure history, child-step state, Outbox, guards, rate limiting, or transactions.

A concrete application adapter is responsible for implementing these transition semantics atomically and durably for its storage technology.

# @event-driven-platform/use-case-execution-store

Defines the technology-neutral durable persistence boundary used to deduplicate and safely recover one logical UseCase invocation.

## Role

The parent UseCase `Intent` is the authoritative logical invocation identity. `ExecutionId` is the durable execution identity derived from that Intent by the Executor. `correlationId` is persisted for traceability only and never creates a new logical invocation.

The store exposes exactly three atomic transitions:

```text
claim -> complete
   \\-> release
```

`claim` returns one of:

- `claimed` — the caller owns a fenced fixed-duration lease and may execute the UseCase;
- `completed` — the exact previously stored final result must be replayed;
- `already-in-progress` — the invocation is not currently reclaimable;
- `intent-conflict` — the ExecutionId is already associated with another authoritative Intent identity.

The Executor currently requests a fixed 30 second lease. The store owns atomic eligibility for claim/reclaim. Once an incomplete claim becomes reclaimable, a new claim must create a newer fenced lease generation.

`complete` and `release` require the shared `ExecutionLeaseReference` from `@event-driven-platform/execution`. A stale owner/version must be rejected without mutating the current execution record.

`complete` makes successful completion terminal and persists the final typed result. `release` only makes a handled failed invocation immediately claimable again while preserving its Intent association; it is not failure history.

The contract intentionally has no lease-renewal transition. The store does not infer whether a running UseCase is healthy or stuck.

## Explicit boundaries

This package does not implement a database, Redis adapter, in-memory production store, serialization framework, UseCaseExecutor, retry policy, attempts, failure history, child-step state, Outbox, guards, rate limiting, transactions, heartbeat, or progress detection.

A concrete application adapter is responsible for implementing claim/reclaim/complete/release semantics atomically and durably for its storage technology.

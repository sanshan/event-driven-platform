# @event-driven-platform/read-execution-coordinator

> **Status: Draft / internal.** This package is not yet part of the supported public package boundary.

Defines the technology-neutral coordination contract used by the read pipeline for transient cross-instance in-flight ownership.

## Role

The coordinator protects expensive read execution after shared cache miss:

```text
shared cache miss
-> claim distributed read execution
-> one owner continues
-> followers wait
```

It is an infrastructure coordination boundary only. It contains no business logic and does not change `Read`, `Query`, or `Reader` responsibilities.

## Identity

Coordination is keyed by the deterministic `ReadCacheKey` established by the Query contract. The same effective identity must represent the same semantic read result, including required namespace, version, partition/security scope, and value components.

## Ownership

A successful claim returns a `ReadExecutionLeaseReference` containing:

- `ownerId` — identifies the current owner;
- `version` — identifies the ownership generation.

A new successful claim after release or expiry must receive a newer generation. Renewal extends the current ownership duration without changing its generation.

`renew` and `release` are ownership-safe: the implementation must verify both owner and generation. A stale owner must receive `ownership-lost` and must not mutate or release a newer owner's lease.

Lease duration is bounded and supplied explicitly per claim/renew request. Concrete clock storage and expiry representation are adapter responsibilities.

## Followers

`wait` represents bounded waiting for the current distributed flight to stop being active. Its outcomes are explicit:

- `released` — the current flight is no longer active and the caller may re-check the shared rendezvous cache;
- `timed-out` — the caller's wait budget expired;
- `cancelled` — the supplied `AbortSignal` was cancelled;
- `unavailable` — the coordination backend could not perform the operation.

The coordinator does **not** return or broadcast the read result.

After `released`, Reader integration must re-read shared cache before attempting another claim. If the result is still unavailable there, the caller re-contends for ownership rather than bypassing coordination.

## Shared rendezvous requirement

Cluster-wide result coalescing under this design requires at least one shared cache level.

The distributed owner writes its successful source result to shared cache. Followers wait for ownership to end and then obtain the result by re-reading that shared cache.

A topology with only local cache, or with no shared result store, must not claim cluster-wide result coalescing through this coordinator alone.

## Failure surface

Coordinator availability is represented explicitly by `unavailable` outcomes on claim/wait/renew/release. This package does not choose Reader's later fail-open/fail-closed execution policy; that belongs to Reader integration.

Lease expiry permits reclaim by a new owner. The new claim must use a newer generation so stale owners cannot interfere with the reclaimed flight.

## Non-responsibilities

This coordinator deliberately does not:

- persist read results;
- transport read results between instances;
- provide durable execution history;
- implement write-side idempotency or an `ExecutionLog` equivalent;
- execute ReadHandlers;
- read or write caches;
- implement local in-process single-flight;
- prescribe Redis or any other coordination technology.

The Redis implementation and Reader integration are separate later tasks in Epic #72.

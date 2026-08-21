# Read release readiness

This document records the release-candidate guarantees and verification evidence for the implemented `Read -> Query -> Reader` pipeline.

Canonical ownership and architectural semantics live in [`architecture/README.md`](architecture/README.md). The supported external package boundary lives in [`read-public-api.md`](read-public-api.md). This document focuses on behavior that has been implemented and qualified before the public API is frozen.

## Implemented lifecycle guarantees

The following behavior is implemented and must be preserved:

- Read remains business-oriented and infrastructure-agnostic;
- Query carries caller controls and optional cache/coordination configuration without executing it;
- Reader is the centralized read execution engine;
- source execution is resolved through `ReadHandlerResolver` and executed through `ReadHandler`;
- missing and ambiguous resolution are explicit failures;
- cache levels are traversed in Query-declared order;
- cache population and promotion run in reverse toward preceding writable levels;
- cache readers and ReadHandlers never write caches;
- local in-flight coalescing collapses same-key downstream work within one Reader process;
- optional distributed coordination collapses same-key source work across instances through shared-cache rendezvous;
- timeout and cancellation bound an individual caller without cancelling otherwise healthy shared work.

## Cache semantics

For a configured plan:

```text
L1 -> L2 -> ... -> Ln -> source
```

Reader stops on the first cache hit. If a lower level hits, Reader promotes the value only into preceding writable levels. If all levels miss or are unavailable, Reader executes the source path and backfills writable levels in reverse order.

Cache IO is deliberately fail-open:

- `miss` continues traversal;
- an explicit cache-reader error outcome continues traversal;
- a thrown cache-reader error is treated as an unavailable level;
- cache promotion/backfill failure cannot replace a successful business result;
- source-handler failure remains authoritative after a full cache miss.

This policy applies to cache IO only. Distributed coordination has a different safety policy because bypassing it can recreate a source stampede.

## Local in-flight semantics

Cached Queries use deterministic `ReadCacheKey` identity for process-local single-flight behavior.

- one local leader continues downstream for a key;
- same-process followers await that shared work;
- unrelated keys remain concurrent;
- the leader re-checks leading local cache after acquiring the flight;
- completed and failed flights are removed;
- a cancelled or timed-out follower stops waiting without cancelling the underlying shared flight.

## Distributed rendezvous semantics

Distributed coordination is optional and entered only for cache plans that request it.

A shared cache level is mandatory for this topology because `ReadExecutionCoordinator` transports ownership, not results.

The qualified flow is:

```text
local cache(s)
-> shared cache(s)
-> distributed claim
   -> owner: shared re-check -> source -> reverse backfill -> release
   -> follower: wait -> shared re-read -> hit or re-contend
```

The owner re-checks shared cache after acquiring ownership before executing the source. Followers re-read shared cache after wake-up or bounded wait completion and re-contend when the value is still absent. Followers do not bypass coordination and execute the source directly.

Healthy ownership is renewed while owner work remains active. Ownership-safe generation fencing prevents a stale owner from renewing or releasing a newer lease.

Coordinator unavailability is fail-closed for a distributed plan: Reader does not run uncontrolled source work when the configured coordination boundary cannot be established.

If ownership is lost before publication, the stale owner must not intentionally publish a new shared result.

## Timeout and cancellation semantics

`QueryOptions.timeoutMs` bounds the complete wait of one `Reader.execute()` caller, including cache traversal, local-flight waiting, distributed waiting, and source work observed by that caller.

`QueryOptions.signal` allows that caller to stop waiting.

These controls do not mean arbitrary JavaScript or external IO can be forcibly terminated. More importantly, one caller timing out or cancelling must not cancel a shared local/distributed flight that may still serve other callers.

## Adapter guarantees

### InMemory cache

The process-local adapter provides bounded capacity, TTL expiry, deterministic clock injection, and oldest-entry eviction. It is disposable local state; correctness does not depend on instance affinity or cache survival.

### Redis cache

The shared cache adapter provides explicit key encoding, codec-based serialization, TTL policy, optional jitter, miss/error distinction, and real Redis integration coverage. It contains no Reader traversal or coordination logic.

### Redis execution coordinator

The Redis coordinator provides atomic claim, ownership-safe renew/release, TTL-bounded per-read lease state, monotonic ownership generations, release-driven follower wake-up, and bounded waiting. It persists no read result or durable execution history.

## Qualification evidence

The Reader verification suite exercises the complete composition against real Redis rather than replacing infrastructure boundaries with mocks.

The current evidence includes:

- 100-request same-instance hot-key fan-in collapsing to one source execution;
- two-instance cold-cache fan-in collapsing distributed source work;
- follower recovery through shared cache and L1 promotion;
- concurrency of unrelated keys;
- cancelled follower isolation;
- recovery after failed local flight;
- follower re-contention after leader source failure;
- fail-closed coordinator outage behavior;
- stale-owner publication protection after lease loss;
- bounded InMemory behavior under 5,000 distinct writes;
- Redis coordination-state reclamation after repeated distinct-key flights;
- Redis cache serialization/expiry integration coverage;
- coordinator contention, renewal, expiry/reclaim, stale release, wake-up, and timeout integration coverage.

The reproducible environment and invariant-to-test mapping are recorded in [`../packages/reader/VERIFICATION.md`](../packages/reader/VERIFICATION.md).

## Test ownership

Verification is intentionally layered rather than duplicated:

- package unit tests own deterministic contract and edge-case behavior;
- Redis adapter integration suites own real Redis adapter semantics;
- Reader verification owns infrastructure-backed end-to-end composition and load/recovery invariants.

A separate generic Reader integration suite is intentionally absent because its previous coverage duplicated the stronger verification suite.

## Release constraints

The Read release does not claim universal throughput, latency, or p99 targets. Those values depend on consumer workload, topology, cache sizing, source behavior, and deployment environment.

The release also does not introduce observability or diagnostics APIs. Cross-pipeline observability and diagnostics are intentionally deferred so Read and Write execution can be designed together rather than establishing incompatible instrumentation contracts independently.

No future capability is part of this release merely because it is discussed elsewhere. Only implemented package-root APIs and behavior documented here are release commitments.

## Remaining release checks

Before the Read package set is considered externally consumable, the repository still must:

1. align package READMEs, root documentation, and agent instructions with the implemented Stable pipeline;
2. publish the candidate packages through the repository's existing local Nx Release/Verdaccio flow;
3. install those artifacts into an isolated external project without workspace path resolution;
4. typecheck and execute representative no-cache and cached/distributed consumer compositions;
5. run the final Epic-wide dependency, documentation, API, and CI audit.

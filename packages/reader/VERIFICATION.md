# Reader load and recovery verification

This document records the reproducible qualification evidence for the Reader execution pipeline covered by Issue #83.

The verification suite is infrastructure-backed end-to-end testing of the Reader pipeline. It is intentionally separate from ordinary unit tests and from narrower integration tests.

## Environment

The repository CI is the canonical verification environment:

- Node.js: 22
- pnpm: 10.33.4
- Redis: `redis:7.4-alpine`
- Reader instances: one or two instances depending on the scenario
- cache topology: bounded InMemory L1 followed by Redis L2
- InMemory configuration used by the load suite: capacities from 16 to 64 entries, TTL 1-2 seconds unless a scenario overrides it
- Redis cache TTL used by the load suite: 5 seconds
- distributed coordinator lease: normally 120-250 ms; shorter values are used only for ownership-loss qualification
- hot-key bursts: 100 concurrent requests
- sustained InMemory pressure: 5,000 distinct writes into a capacity-64 cache
- Redis coordination lifecycle pressure: 50 distinct completed flights

Run the verification suite with a real Redis instance:

```bash
READ_COORDINATOR_REDIS_URL=redis://127.0.0.1:6379 \
pnpm nx run @event-driven-platform/reader:test:verification
```

CI starts Redis conditionally when Reader or the Redis-backed read components are affected.

## Evidence matrix

| Invariant | Evidence |
| --- | --- |
| Same-instance hot-key fan-in collapses downstream work | `default-reader.load.verification.spec.ts`: 100 identical requests produce one source execution and populate L1 |
| Multi-instance cold-cache fan-in collapses distributed work | `default-reader.load.verification.spec.ts`: 50 + 50 requests across two Reader instances produce one healthy source execution |
| Followers recover through shared cache and promote L1 | `default-reader.load.verification.spec.ts`: both instance-local caches contain the shared result after the burst |
| Unrelated keys remain concurrent | `default-reader.load.verification.spec.ts`: two independent source executions are active concurrently |
| Cancelled follower does not cancel the shared flight | `default-reader.load.verification.spec.ts` plus `default-reader.inflight.spec.ts` |
| Failed local flight is removed and a later request can recover | `default-reader.load.verification.spec.ts` plus `default-reader.inflight.spec.ts` |
| Leader source failure releases followers for re-contention | `default-reader.recovery.verification.spec.ts`: waiting second instance re-contends and succeeds after the first leader fails |
| Coordinator outage is fail-closed | `default-reader.recovery.verification.spec.ts` and `distributed-read-flight.spec.ts`: source is not executed when coordination cannot be established |
| Lease ownership loss prevents stale publication | `default-reader.recovery.verification.spec.ts`: slow owner loses renewal, fails with ownership-lost, and does not populate L1 |
| Lease expiry is reclaimable and stale release cannot remove a new owner | `read-execution-coordinator-redis.integration.spec.ts` |
| Healthy leases are renewed | `read-execution-coordinator-redis.integration.spec.ts` |
| Waiting is release-driven and timeout-bounded | `read-execution-coordinator-redis.integration.spec.ts` |
| Cache reader failure degrades to the established traversal policy | `default-reader.cache.spec.ts` |
| Promotion/backfill failure does not replace a successful business result | `default-reader.cache.spec.ts` |
| Source failure propagates after full cache miss | `default-reader.cache.spec.ts` |
| Independent caller timeout does not cancel a shared local flight | `default-reader.inflight.spec.ts` |
| InMemory cache remains bounded under sustained distinct-key pressure | `default-reader.load.verification.spec.ts`: 5,000 writes leave exactly the configured 64 entries |
| TTL jitter stays within the configured range and follows deterministic sampling | `read-cache-redis.spec.ts` |
| Redis per-key coordination state is reclaimed | `default-reader.recovery.verification.spec.ts`: after 50 completed distinct-key flights no lease keys remain; only the single generation key persists |
| Redis cache serialization and expiry semantics are exercised against real Redis | `read-cache-redis.integration.spec.ts` |

## Failure semantics being qualified

The verification suite does not define new failure policy. It confirms the behavior established by earlier Reader/cache/coordinator tasks:

- cache read errors are treated as unavailable cache levels and traversal continues;
- cache promotion/backfill is best-effort and cannot replace a successful read result;
- distributed coordination failure is fail-closed, because executing the source without coordination would reintroduce a stampede under multi-instance load;
- loss of distributed ownership prevents the stale owner from publishing its result;
- source failures are propagated to the owner, while waiting instances are released and may re-contend;
- query timeout/cancellation controls an individual caller and must not corrupt an otherwise healthy shared flight;
- Redis lease state is TTL/release bounded rather than permanently accumulating per read key.

## Scope limits

This qualification does not introduce throughput or p99 promises. A reusable library has no meaningful universal latency target without a concrete workload and deployment topology.

It also does not introduce observability or diagnostics APIs. Metrics and tracing are intentionally deferred to a separate cross-pipeline architecture covering both Read and Write execution.

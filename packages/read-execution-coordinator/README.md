# @event-driven-platform/read-execution-coordinator

Defines the technology-neutral distributed coordination contract for transient cross-instance Read execution ownership.

## Role

After shared-cache miss, Reader may use a coordinator to ensure that only one instance owns downstream source work for a deterministic `ReadCacheKey` while followers wait and later re-read shared cache.

```text
shared cache miss
-> claim
   -> owner continues
   -> followers wait
-> result rendezvous happens through shared cache
```

The coordinator transports ownership, not the read result.

## Ownership model

A successful claim returns a `ReadExecutionLeaseReference` containing `ownerId` and monotonic ownership `version`. Renewal extends the current generation. Renew and release must verify the complete ownership reference so a stale owner cannot mutate a reclaimed lease.

Lease duration is explicit and bounded. Storage technology, clock representation, and expiry implementation belong to adapters.

## Followers

`wait` is bounded and returns explicit outcomes: `released`, `timed-out`, `cancelled`, or `unavailable`. After waiting, Reader re-reads shared cache and re-contends when the value is still absent. The coordinator never broadcasts the result.

## Shared-cache requirement

Cluster-wide result coalescing requires at least one shared cache level. The owner publishes a successful result through shared cache; followers obtain it by re-reading that cache after the flight changes state.

A coordinator alone cannot provide cluster-wide result rendezvous for a local-only/no-cache topology.

## Failure boundary

Coordinator availability is explicit through contract outcomes. Reader owns the execution policy. The stable Reader integration fails closed when configured distributed coordination is unavailable rather than bypassing coordination and creating uncontrolled source work.

## Non-responsibilities

This package does not persist results or durable execution history, execute handlers, read/write caches, implement local single-flight, or prescribe Redis.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)

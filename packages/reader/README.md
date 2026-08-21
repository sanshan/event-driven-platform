# @event-driven-platform/reader

Central execution engine for the stable `Read -> Query -> Reader` pipeline.

## Role

Reader interprets Query execution configuration while keeping Read and ReadHandler infrastructure-agnostic.

```text
Query -> Reader
          |
          +-> cache traversal / population
          +-> local in-flight coalescing
          +-> optional distributed coordination
          +-> ReadHandlerResolver -> ReadHandler
```

## Basic usage

```ts
import { DefaultReader } from '@event-driven-platform/reader';

const reader = new DefaultReader({
    readHandlerResolver,
});

const result = await reader.execute({
    read: {
        name: 'user.get',
        actor,
        parameters: { userId: 'user-42' },
    },
    context: {
        correlationId: 'request-123',
    },
});
```

`DefaultReader` requires a `ReadHandlerResolver`. `readTimeout`, `readExecutionCoordinator`, and `readExecutionOwnerIdFactory` are optional composition dependencies.

## Cached composition

Cache topology belongs to Query. For example, a process-local L1 followed by shared L2:

```ts
const result = await reader.execute({
    read,
    context: { correlationId },
    options: {
        timeoutMs: 2_000,
        cache: {
            key: {
                namespace: 'user.get',
                version: '1',
                partition: 'tenant:tenant-1',
                value: 'user:user-42',
            },
            levels: [
                { scope: 'local', reader: l1, writer: l1 },
                { scope: 'shared', reader: l2Reader, writer: l2Writer },
            ],
            coordination: {
                leaseDurationMs: 1_000,
            },
        },
    },
});
```

When `coordination` is present, `DefaultReader` must also receive a `ReadExecutionCoordinator`, and the plan must contain shared cache. The coordinator transports ownership only; successful distributed rendezvous happens through shared cache.

## Execution semantics

Reader traverses cache levels in declared order and stops on the first hit. Lower-level hits are promoted only into preceding writable levels. Full misses execute the resolved source handler and backfill writable levels in reverse order.

Cache IO is fail-open for result correctness: unavailable reads continue traversal and failed cache writes cannot replace a successful result. Distributed coordination is fail-closed because bypassing a configured coordinator could create uncontrolled duplicate source work.

Cached Queries use deterministic `ReadCacheKey` identity for process-local single-flight. Distributed plans extend that coalescing across instances with ownership-safe leases and shared-cache rendezvous.

## Handler resolution

`DefaultReader` resolves the Read through `ReadHandlerResolver`. `not-found` and `ambiguous` outcomes become typed Reader errors. The current source contract executes the first handler in a resolved deterministic handler set; `ReadHandler` has no fallback `miss` outcome.

## Timeout and cancellation

`QueryOptions.timeoutMs` bounds one caller's complete Reader wait. `QueryOptions.signal` lets that caller stop waiting. A timed-out or cancelled follower does not cancel healthy shared work serving other callers.

## Public API

The package exports `Reader`, `DefaultReader`, `DefaultReaderDependencies`, `ReadTimeout`, and typed errors for handler resolution, timeout/cancellation, missing/unavailable coordination, and ownership loss.

Internal services implementing source execution, cache traversal, local in-flight behavior, distributed-flight orchestration, and the default timeout are deliberately not exported. Consumers should import only from the package root.

## Verification

Infrastructure-backed load/recovery verification and the invariant-to-test map are documented in [`VERIFICATION.md`](VERIFICATION.md).

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)

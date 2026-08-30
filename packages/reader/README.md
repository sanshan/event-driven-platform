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

`DefaultReader` requires a `ReadHandlerResolver`. `readTimeout`, `readExecutionCoordinator`, `readExecutionOwnerIdFactory`, and `retryDelay` are optional composition dependencies.

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

`DefaultReader` resolves the Read through `ReadHandlerResolver`. `not-found` and `ambiguous` outcomes become one typed `ReadHandlerResolutionFailedError` (`status: 'not-found' | 'ambiguous'`). The current source contract executes the first handler in a resolved deterministic handler set; `ReadHandler` has no fallback `miss` outcome.

## Timeout and cancellation

`QueryOptions.timeoutMs` bounds one caller's complete Reader wait. `QueryOptions.signal` lets that caller stop waiting. A timed-out or cancelled follower does not cancel healthy shared work serving other callers.

## Retry

An opt-in `retry` policy retries only the source-executor invocation:

```ts
const result = await reader.execute({
    read,
    context: { correlationId },
    options: {
        retry: {
            maxAttempts: 3,
            strategy: { type: 'exponential', initialDelayMs: 100, multiplier: 2, jitter: true },
        },
    },
});
```

`retry` never wraps cache traversal, local in-flight coalescing, or distributed coordination — those keep the recovery paths described above. Under local in-flight coalescing or a distributed lease, only the leader/owner retries; followers/waiters transparently share its final result. A `ReadExecutionCoordinatorFailedError` (coordinator unavailable, or ownership lost) is never retried by this mechanism.

An error is retried only when it normalizes (via the same `ExecutionFailure`/`ExecutionFailureError` classification Runner uses) to `retryable: true`; an unclassified thrown error defaults to non-retryable. When writing a `ReadHandler`, throw transient failures (connection reset, upstream 5xx, timeout) as `new ExecutionFailureError({ code, message, retryable: true })` — validation and business-logic failures should stay `retryable: false` or use a domain-specific typed error.

`QueryOptions.timeoutMs` continues to bound the whole call across every retry attempt; there is no separate per-attempt timeout. A superseded in-flight source call from a prior attempt is not actively cancelled (accepted, `maxAttempts`-bounded compromise; tracked in [#187](https://github.com/sanshan/event-driven-platform/issues/187)). Inside a distributed-flight owner, lease-ownership loss is only detected once the whole retry sequence resolves, not between attempts — still fail-safe, but see [#188](https://github.com/sanshan/event-driven-platform/issues/188) for the tracked follow-up.

## Public API

The package exports `Reader`, `DefaultReader`, `DefaultReaderDependencies`, `ReadTimeout`, `RetryDelay`, and typed errors for handler resolution, timeout, cancellation, coordination configuration, and coordinator failure. Every typed error extends `ExecutionFailureError` (from `@event-driven-platform/execution`), so callers can catch all of them with one `instanceof ExecutionFailureError` check and branch on `executionFailure.code`:

- `ReadTimedOutError` — a Read exceeded its configured timeout (`retryable: true`);
- `ReadCancelledError` — the caller's Query signal cancelled the Read (`retryable: false`);
- `ReadHandlerResolutionFailedError` — no `ReadHandler` was resolved, or resolution was ambiguous (`status: 'not-found' | 'ambiguous'`, `retryable: false`);
- `ReadExecutionCoordinationNotConfiguredError` — distributed coordination is requested by the cache plan but not correctly configured (`retryable: false`);
- `ReadExecutionCoordinatorFailedError` — the configured `ReadExecutionCoordinator` reported it is unavailable, or a distributed owner lost its lease before publishing (`outcome: 'unavailable' | 'ownership-lost'`, `retryable: true`).

Internal services implementing source execution, cache traversal, local in-flight behavior, distributed-flight orchestration, and the default timeout are deliberately not exported. Consumers should import only from the package root.

## Verification

Infrastructure-backed load/recovery verification and the invariant-to-test map are documented in [`VERIFICATION.md`](VERIFICATION.md).

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)

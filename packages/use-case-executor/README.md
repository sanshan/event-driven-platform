# @event-driven-platform/use-case-executor

Durable invocation boundary for application UseCases.

`UseCaseExecutor` derives execution identity from the supplied UseCase context `Intent`, claims the invocation through `UseCaseExecutionStore`, executes only a safely claimed UseCase, persists successful completion, and replays the exact stored result for an already completed invocation.

## Supported entrypoint boundary

Service/application entrypoints execute business flows through:

```text
entrypoint -> UseCaseExecutor -> UseCase
```

A `UseCase` remains directly callable for isolated tests and internal composition, but direct `useCase.execute(...)` is not the supported service entrypoint path because it bypasses durable invocation claim and completion replay.

Concrete UseCases may invoke Operations through `Runner` and Reads through `Reader`. `UseCaseExecutor` does not execute Operations or Reads itself and has no production dependency on Runner or Reader.

## Invocation context

Every execution request carries one authoritative `context`. Its concrete type extends the base `UseCaseContext`, whose EDP-owned fields are `intent` and `correlationId`. A concrete UseCase may add invocation-specific metadata to that context; the Executor treats those additional fields as opaque and forwards the same context object unchanged to `useCase.execute()`.

Stable reusable UseCase dependencies belong in the UseCase itself rather than in invocation context. EDP does not add actor, tenant, transport, DI, or ambient-context semantics to the base contract.

## Fixed lease semantics

Every successful claim uses a fixed 30 second lease. The Executor does not renew that lease and does not try to infer whether a still-running UseCase is healthy, progressing, or stuck.

The 30 second lease is a recovery window, not a UseCase timeout. A UseCase may continue running after the lease expires. Once the lease is reclaimable, another Executor may reclaim the same incomplete invocation. The original Executor may also continue running, so concurrent orchestration is possible before durable completion.

Safety is provided by fencing: `complete` and `release` use the exact lease returned by `claim`. If another owner has reclaimed the invocation and advanced the lease generation, stale completion/release must be rejected by the store.

## Execution semantics

For a completed invocation:

```text
same Intent
-> claim returns completed
-> exact stored result is returned
-> UseCase is not executed again
```

For an incomplete invocation whose claim can be reclaimed:

```text
same Intent
-> claim/reclaim
-> UseCase starts again from the beginning
```

The Executor does not checkpoint orchestration steps and does not infer whole-UseCase completion from child Operations. Before durable UseCase completion, Reads and orchestration may run again. This is not exactly-once UseCase code execution and it is not deterministic workflow replay.

Retry-safe write effects depend on deterministic child Operation Intents and Runner idempotency/conflict handling.

An active duplicate is rejected with `UseCaseAlreadyInProgressError`; followers are not waited, polled, or coalesced by this package.

If a UseCase throws, the Executor attempts a fenced release and rethrows the original UseCase error. Retry cadence remains the responsibility of the invoking transport/application boundary; there is no internal UseCase retry policy.

A rejected durable completion is surfaced as `UseCaseExecutionTransitionError` rather than returning an unpersisted result.

## Identity and correlation

`context.intent` is the authoritative logical invocation identity. `context.correlationId` is used unchanged for distributed-flow grouping and never participates in execution identity or idempotency.

## Public API

The package-root API intentionally exposes:

- `UseCaseExecutor` and `DefaultUseCaseExecutor`;
- `UseCaseExecutionRequest`;
- `UseCaseExecutorDependencies` and `UseCaseExecutorRuntime` for composition;
- typed errors for active duplicates, Intent conflicts, and rejected durable completion.

There is no timer, heartbeat, lease-renewal, or ownership-health API.

## Boundaries

This package does not implement Runner-style retries, guards, rate limiting, timeouts, attempts, execution transactions, Outbox/event publication, child-step persistence, broker behavior, CorrelationId generation, Operation execution, Read execution, UseCase cancellation, progress detection, or a concrete durable store adapter.

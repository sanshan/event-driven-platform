# @event-driven-platform/use-case-executor

Durable invocation boundary for application UseCases.

`UseCaseExecutor` derives execution identity from the supplied UseCase `Intent`, claims the invocation through `UseCaseExecutionStore`, executes only a safely claimed UseCase, renews ownership while work remains active, persists successful completion, and replays the exact stored result for an already completed invocation.

## Supported entrypoint boundary

Service/application entrypoints execute business flows through:

```text
entrypoint -> UseCaseExecutor -> UseCase
```

A `UseCase` remains directly callable for isolated tests and internal composition, but direct `useCase.execute(...)` is not the supported service entrypoint path because it bypasses durable invocation claim and completion replay.

Concrete UseCases may invoke Operations through `Runner` and Reads through `Reader`. `UseCaseExecutor` does not execute Operations or Reads itself and has no production dependency on Runner or Reader.

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

The Executor does not checkpoint orchestration steps and does not infer whole-UseCase completion from child Operations. Before durable UseCase completion, Reads and orchestration may run again. Retry-safe write effects depend on deterministic child Operation Intents and the existing Runner idempotency/conflict boundary.

An active duplicate is rejected with `UseCaseAlreadyInProgressError`; followers are not waited, polled, or coalesced by this package.

If a UseCase throws, the Executor attempts a fenced release and rethrows the original UseCase error. Retry cadence remains the responsibility of the invoking transport/application boundary; there is no internal UseCase retry policy.

A long-running claimed execution renews its lease before expiry. If renewal is rejected or ownership cannot be confirmed, the Executor treats ownership as lost and must not persist or return a later successful UseCase result as durable completion. The already-started UseCase is not force-cancelled by a hidden cancellation mechanism.

A rejected durable completion is surfaced as `UseCaseExecutionTransitionError` rather than returning an unpersisted result.

## Identity and correlation

`Intent` is the authoritative logical invocation identity. `correlationId` is propagated unchanged into `UseCaseContext` for distributed-flow grouping and never participates in execution identity or idempotency.

## Public API

The package-root API intentionally exposes:

- `UseCaseExecutor` and `DefaultUseCaseExecutor`;
- `UseCaseExecutionRequest`;
- `UseCaseExecutorDependencies` and `UseCaseExecutorRuntime` for composition;
- typed Executor errors for active duplicates, Intent conflicts, ownership loss, invalid configuration, and rejected durable transitions.

Heartbeat timer/lifecycle implementation details are internal and are not a supported package-root API.

## Boundaries

This package does not implement Runner-style retries, guards, rate limiting, timeouts, attempts, execution transactions, Outbox/event publication, child-step persistence, broker behavior, CorrelationId generation, Operation execution, Read execution, or a concrete durable store adapter.

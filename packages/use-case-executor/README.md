# @event-driven-platform/use-case-executor

Durable invocation boundary for application UseCases.

`UseCaseExecutor` derives execution identity from the supplied UseCase `Intent`, claims the invocation through `UseCaseExecutionStore`, executes only a safely claimed UseCase, persists successful completion, and replays the exact stored result for an already completed invocation.

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
-> expired/released incomplete execution
-> claim/reclaim
-> UseCase starts again from the beginning
```

The Executor does not checkpoint orchestration steps and does not infer whole-UseCase completion from child Operations. Before durable UseCase completion, Reads and orchestration may run again. Retry-safe write effects depend on deterministic child Operation Intents and the existing Runner idempotency/conflict boundary.

An active duplicate is rejected with `UseCaseAlreadyInProgressError`; followers are not waited, polled, or coalesced by this package.

Each claim uses a fixed 30 second lease window. The Executor does not renew or heartbeat the lease while the UseCase is running. After the lease expires, the durable store may allow another executor to reclaim the invocation. This intentionally does not promise exactly-once UseCase code execution.

Completion and release are fenced with the lease returned by `claim`. If another executor has already reclaimed the invocation and advanced ownership, a stale executor cannot durably complete it. A rejected durable completion is surfaced as `UseCaseExecutionTransitionError` rather than returning an unpersisted result.

If a UseCase throws, the Executor attempts a fenced release and rethrows the original UseCase error. Retry cadence remains the responsibility of the invoking transport/application boundary; there is no internal UseCase retry policy.

## Identity and correlation

`Intent` is the authoritative logical invocation identity. `correlationId` is propagated unchanged into `UseCaseContext` for distributed-flow grouping and never participates in execution identity or idempotency.

## Public API

The package-root API intentionally exposes:

- `UseCaseExecutor` and `DefaultUseCaseExecutor`;
- `UseCaseExecutionRequest`;
- `UseCaseExecutorDependencies` and `UseCaseExecutorRuntime` for composition;
- typed Executor errors for active duplicates, Intent conflicts, and rejected durable completion.

There is no public timer, heartbeat, renewal interval, or lease-duration configuration API.

## Boundaries

This package does not implement Runner-style retries, guards, rate limiting, timeouts, attempts, execution transactions, Outbox/event publication, child-step persistence, broker behavior, CorrelationId generation, Operation execution, Read execution, progress detection, lease renewal, or a concrete durable store adapter.

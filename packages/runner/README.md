# @event-driven-platform/runner

The centralized execution engine for the platform's write pipeline.

## Installation

```bash
pnpm add @event-driven-platform/runner
```

Runner is normally composed together with the persistence and handler-resolution contracts it depends on. Install the packages your application imports directly.

## Role

```text
Operation -> Command -> Runner
```

Runner executes Commands and owns infrastructure-centric execution behavior: idempotency, execution-log transitions, transaction coordination, handler resolution, guard evaluation, rate limiting, timeout, retry, result persistence, and Outbox persistence.

Operations and handlers must not reproduce or bypass these responsibilities.

## Primary API

- `Runner` / `RunnerExecution` — execution contract and typed execution result.
- `createRunner()` / `CreateRunnerOptions` — supported Runner construction entry point.
- `RunnerDependencies` — required and optional integration ports.
- `RunnerRuntime`, `RunnerOptions`, `RunnerResultSource` — runtime/options/result metadata contracts.

## Consumer-provided runtime ports

Runner exposes orchestration-specific ports for `GuardEvaluator`, `RateLimiter`, `ExecutionTimeout`, and `RetryDelay`. `DefaultExecutionTimeout` and `DefaultRetryDelay` are provided when the defaults are suitable.

All terminal failures thrown by `Runner.execute()` and `Runner.executeDetailed()` are canonical `ExecutionError` instances from `@event-driven-platform/execution`. Runner's exported typed errors extend that class, so callers can distinguish execution conflicts, policy rejection, timeout, unavailable policy infrastructure, and rejected state transitions while making machine decisions from `error.executionFailure` instead of parsing messages.

Unknown Handler, persistence, policy, and runtime errors are normalized to an internal canonical failure. When the original value is an `Error`, it remains available as `cause`; only the bounded serializable failure descriptor is written to the execution log, never its cause or stack.

Runner schedules another attempt only when all of the following hold:

- the canonical descriptor has `retry: 'current-execution'`;
- the Command configures `options.retry`;
- the failed attempt was durably recorded;
- `maxAttempts` has not been exhausted.

`retry: 'caller'` never consumes Runner's same-execution retry loop. Successful and business-rejected `OperationResult` values remain results and are not converted into errors.

## Composition

A consuming application supplies adapters for execution-log persistence, execution transactions, Operation handler resolution, and Outbox persistence, then constructs Runner with `createRunner()`. Optional guard/rate-limit/runtime implementations are supplied only when those policies are used or overridden.

Execute Commands through `Runner.execute()`; do not call Operation handlers directly as an alternative execution path.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md) — canonical architecture.
- [`docs/execution-public-api.md`](../../docs/execution-public-api.md) — frozen Execution public boundary and composition model.
- [`docs/execution-release-readiness.md`](../../docs/execution-release-readiness.md) — execution guarantees verified for release.

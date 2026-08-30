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

Every typed error Runner throws extends `ExecutionFailureError` (from `@event-driven-platform/execution`), so callers can catch all of them with one `instanceof ExecutionFailureError` check and branch on `executionFailure.code` instead of parsing `message`:

- `ExecutionGuardRejectedError` — a configured guard rejected execution (`retryable: false`);
- `ExecutionRateLimitRejectedError` — a configured rate limit rejected execution (`retryable: false`);
- `ExecutionTimedOutError` — a handler attempt exceeded its configured timeout (`retryable: true`);
- `ExecutionPolicyUnavailableError` — a guard or rate limit is configured but its evaluator/limiter dependency was not supplied (`policy: 'guard' | 'rate-limit'`, `retryable: false`);
- `ExecutionClaimRejectedError` — claiming the execution was rejected because another attempt already owns it (`reason: 'already-in-progress'`, `retryable: true` — the owning attempt is expected to finish or its lease to expire) or because the execution conflicts with a different Intent (`reason: 'intent-conflict'`, `retryable: false` — a structural mismatch that retrying cannot resolve);
- `ExecutionTransitionRejectedError` — the execution log store rejected a `complete`/`fail` transition (execution not found, not in progress, or a lease conflict; `retryable: false`).

`retryable` here only classifies the failure; whether Runner actually retries an attempt still additionally requires `Command.options.retry` to be configured.

## Composition

A consuming application supplies adapters for execution-log persistence, execution transactions, Operation handler resolution, and Outbox persistence, then constructs Runner with `createRunner()`. Optional guard/rate-limit/runtime implementations are supplied only when those policies are used or overridden.

Execute Commands through `Runner.execute()`; do not call Operation handlers directly as an alternative execution path.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md) — canonical architecture.
- [`docs/execution-public-api.md`](../../docs/execution-public-api.md) — frozen Execution public boundary and composition model.
- [`docs/execution-release-readiness.md`](../../docs/execution-release-readiness.md) — execution guarantees verified for release.

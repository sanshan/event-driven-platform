# Execution public API boundary

This document freezes the public package and API boundary for the first Execution release after completion of guard, rate-limit, timeout, and retry orchestration in Epic #29.

The existing `Operation -> Command -> Runner` architecture remains unchanged. This boundary is intentionally the smallest package graph required for an external repository to define Commands, compose a Runner, provide infrastructure adapters, execute Operations, and observe typed execution outcomes.

## Final release package set

The Execution release consists of the following approved packages in addition to the already-public core packages.

### Command and policy contracts

- `@event-driven-platform/guard`
- `@event-driven-platform/rate-limit`
- `@event-driven-platform/retry`
- `@event-driven-platform/command`

These packages describe execution policy configuration carried by Command. They contain no domain execution logic.

### Execution identity and persistence contracts

- `@event-driven-platform/clock`
- `@event-driven-platform/execution`
- `@event-driven-platform/execution-log`
- `@event-driven-platform/execution-log-store`
- `@event-driven-platform/execution-transaction`

These packages define execution identity, attempts, leases, failure state, durable execution-log transitions, and the transaction boundary required by Runner.

### Handler and Outbox composition contracts

- `@event-driven-platform/operation-handler`
- `@event-driven-platform/operation-handler-resolver`
- `@event-driven-platform/operation-event-envelope-factory`
- `@event-driven-platform/outbox`
- `@event-driven-platform/outbox-store`

These packages are consumer-visible because external applications must provide operation handlers/resolution and persistence adapters while Runner remains infrastructure-centric.

### Execution engine

- `@event-driven-platform/runner`

Runner is the only execution engine. Consumers must not bypass it to implement idempotency, guard evaluation, rate limiting, timeout, retry, execution-log transitions, or Outbox persistence independently.

## Installation

Packages are installed through normal npm dependencies. Consumers should declare the packages they import directly rather than depending on workspace source resolution. A typical Runner composition uses:

```bash
pnpm add \
  @event-driven-platform/command \
  @event-driven-platform/runner \
  @event-driven-platform/execution-log-store \
  @event-driven-platform/execution-transaction \
  @event-driven-platform/operation-handler-resolver \
  @event-driven-platform/outbox-store
```

The Execution group has its own fixed release version and `execution-v{version}` git tag namespace. Its declared dependencies remain compatible with the separately versioned public core.

## Runner public surface

The following Runner exports are intentional public contracts.

### Primary execution API

- `Runner`
- `RunnerExecution`
- `RunnerResultSource`
- `createRunner`
- `CreateRunnerOptions`
- `RunnerDependencies`
- `RunnerRuntime`
- `RunnerOptions`

### Consumer-provided infrastructure ports

- `GuardEvaluator` and `GuardEvaluationRequest`
- `RateLimiter` and its consume/decision contracts
- `ExecutionTimeout` and its result contracts
- `RetryDelay`

These ports remain in the `runner` package because they are orchestration-specific runtime concerns. No additional package is required for them.

### Default runtime helpers

- `DefaultExecutionTimeout`
- `DefaultRetryDelay`

Consumers may replace them through `RunnerDependencies` for deterministic testing or custom runtime integration.

### Typed execution errors

The exported Runner errors are intentional because callers may need to distinguish idempotency/concurrency conflicts, policy rejection, timeout, missing infrastructure configuration, and transition failures without inspecting error messages.

Internal helpers such as rate-limit bucket construction, retry-delay calculation, failure normalization, and `DefaultRunner` remain unexported implementation details.

## Consumer composition model

A consuming repository is expected to:

1. define reusable domain `Operation` types and handlers;
2. wrap Operations in `Command` values containing optional execution policy configuration;
3. implement or adapt `ExecutionLogStore`, `ExecutionTransaction`, `OperationHandlerResolver`, and `OutboxStore`;
4. optionally provide `GuardEvaluator`, `RateLimiter`, `ExecutionTimeout`, or `RetryDelay` overrides;
5. construct Runner through `createRunner()`;
6. execute Commands only through Runner.

Operations remain unaware of retries, rate limiting, guards, timeout, persistence, messaging, and Outbox infrastructure. OperationHandlers execute one Operation against the domain transaction boundary and do not orchestrate other Operations.

The repository's release verification installs the package set into an isolated project, typechecks against the installed declarations, and executes a representative ESM `Operation -> Command -> Runner` flow with guards, rate limiting, timeout, and retry enabled. This verification is intentionally independent of workspace source resolution.

## Packages intentionally outside this release

Packages unrelated to constructing or executing the write pipeline remain private. In particular, the incomplete read-side packages and any repository-specific infrastructure implementations are not made public merely because they exist in the workspace.

The release boundary must not be expanded during publication or final verification without reopening the appropriate release-boundary review.

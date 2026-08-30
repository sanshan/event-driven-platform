# @event-driven-platform/retry

Defines retry policies that a Command can request from Runner.

## Installation

```bash
pnpm add @event-driven-platform/retry
```

## API

- `RetryOptions` — Command retry configuration.
- `RetryStrategy` — retry strategy contract.
- `FixedRetryStrategy` and `ExponentialRetryStrategy` — supported strategy shapes. Both accept an optional `jitter` flag; when enabled, the consuming package's delay calculator randomizes the actual delay between 0 and the computed delay ("full jitter") to avoid synchronized retries across concurrent callers.
- `DefaultFixedRetryStrategyFactory` and `DefaultExponentialRetryStrategyFactory` — default factories.

## Role

Retry is execution policy, not Operation behavior. Runner interprets retry options and controls attempts; Operations and handlers do not implement retry loops.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

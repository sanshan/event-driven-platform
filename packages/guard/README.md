# @event-driven-platform/guard

Defines Command-level guard policy options for the write execution pipeline.

## Installation

```bash
pnpm add @event-driven-platform/guard
```

## API

The package exports `GuardOptions`, the policy configuration carried by a `Command` when execution must be conditionally allowed or rejected.

Guard evaluation itself belongs to Runner. Consumers provide a `GuardEvaluator` through the Runner runtime boundary when guard options are used.

## Architectural boundary

This package contains policy configuration, not guard execution or business logic. Operations remain unaware of guards.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

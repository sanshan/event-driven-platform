# @event-driven-platform/operation-handler-resolver

Defines the application integration port Runner uses to resolve the handler for an Operation.

## Installation

```bash
pnpm add @event-driven-platform/operation-handler-resolver
```

## API

`OperationHandlerResolver` resolves the `OperationHandler` responsible for a concrete Operation. Applications implement this port using their composition mechanism or dependency-injection container.

## Architectural boundary

Resolution maps Operations to handlers; it does not execute Operations or own execution policy. Runner remains the only execution engine.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

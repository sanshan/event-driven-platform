# @event-driven-platform/operation-handler

Defines the handler contract that performs the domain work for one Operation.

## Installation

```bash
pnpm add @event-driven-platform/operation-handler
```

## API

`OperationHandler` is the package's public contract. Applications implement handlers for their concrete Operation types and return the corresponding typed Operation result.

## Architectural boundary

A handler executes one Operation against the domain transaction boundary. It does not orchestrate other Operations and must not implement Runner responsibilities such as idempotency, retry, guard/rate-limit enforcement, execution logging, or Outbox persistence.

Handlers are resolved and invoked by Runner; consumers should not bypass Runner to execute them as a replacement execution pipeline.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

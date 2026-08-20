# @event-driven-platform/operation-event-envelope-factory

Creates event envelopes from events emitted by an Operation result and the metadata of the executing Operation.

## Installation

```bash
pnpm add @event-driven-platform/operation-event-envelope-factory
```

## API

- `OperationEventEnvelopeFactory` — factory contract used by execution orchestration.
- `DefaultOperationEventEnvelopeFactory` — default implementation that builds platform `EventEnvelope` values from Operation execution context.

## Role

Runner uses this boundary before persisting emitted events to the Outbox. Operations emit events as data; they do not create messaging infrastructure records or publish events themselves.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

# @event-driven-platform/outbox-store

Defines the persistence port Runner uses to store Outbox records atomically with Operation execution.

## Installation

```bash
pnpm add @event-driven-platform/outbox-store
```

## API

`OutboxStore` is the consumer-implemented storage contract for persisting Outbox records.

Applications adapt their persistence technology to this port and provide the implementation to Runner composition.

## Architectural boundary

The store persists records only. It does not publish messages, execute Operations, or own transaction orchestration. Runner coordinates persistence; downstream CDC/messaging infrastructure publishes persisted Outbox data.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

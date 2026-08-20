# @event-driven-platform/outbox

Defines the durable Outbox record model used to persist event envelopes as part of write execution.

## Installation

```bash
pnpm add @event-driven-platform/outbox
```

## API

The package provides `OutboxRecord`, `OutboxRecordId`, the `OutboxRecordFactory` contract, and `DefaultOutboxRecordFactory` for constructing records from event envelopes.

## Role

Runner persists Outbox records in the execution transaction. Publishing those records to messaging infrastructure is outside Operations and outside this package.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

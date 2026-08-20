# @event-driven-platform/execution-log-store

Defines the persistence port Runner uses to claim and transition durable execution-log records.

## Installation

```bash
pnpm add @event-driven-platform/execution-log-store
```

## API

`ExecutionLogStore` is the consumer-implemented persistence contract. Its operations cover:

- claiming an execution by intent;
- completing an in-progress execution;
- recording a failed attempt;
- reporting typed transition outcomes such as completed-existing, already-in-progress, intent-conflict, lease-conflict, and invalid-state cases.

Consumers provide an adapter implementing this contract; Runner interprets the typed transition results.

## Architectural boundary

Persistence adapters implement storage semantics only. They do not reproduce Runner orchestration, retries, guards, rate limiting, or Outbox behavior.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

# @event-driven-platform/event

Defines domain event contracts and the event envelope used to carry execution metadata with emitted events.

## Installation

```bash
pnpm add @event-driven-platform/event
```

## API

- `Event`, `AnyEvent` — domain event contracts.
- `EventId` and `DefaultEventIdFactory` — deterministic event identity contracts and default factory.
- `EventEnvelope`, `AnyEventEnvelope` — event plus metadata envelope.
- `EventActor` and `EventSubject` — envelope metadata contracts.

## Role

Operations may produce events as part of their result. Operations do not publish them. Runner persists event envelopes to the Outbox through the execution pipeline.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

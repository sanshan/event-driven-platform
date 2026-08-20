# @event-driven-platform/actor

Defines the actor metadata used to describe who initiated platform work.

## Installation

```bash
pnpm add @event-driven-platform/actor
```

## Role

An `Actor` is execution/domain metadata. It identifies the initiating actor without coupling Operations to authentication or transport infrastructure.

## API

- `Actor`, `ActorDescriptor`, `ActorOrigin`, `ActorType` — actor contracts.
- `ActorFactory` — factory contract for constructing actors.
- `DefaultActorFactory` — default validated factory implementation.

Use the factory when constructing actor values from descriptors rather than duplicating validation/construction rules.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) for the platform architecture.

# @event-driven-platform/event

Defines domain event contracts and the event envelope used to carry execution metadata with emitted events.

## Installation

```bash
pnpm add @event-driven-platform/event
```

## Runtime Event contracts

Use one Zod-backed contract as the runtime and TypeScript source of truth for an Event's name, business schema version, and payload:

```ts
import { z } from 'zod';
import {
    defineEventContract,
    type EventEnvelopeOf,
    type EventOf,
    type EventPayloadOf,
} from '@event-driven-platform/event';

const DocumentRegistered = defineEventContract({
    name: 'documents.registered',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        storageReference: z.string(),
    }),
});

type Payload = EventPayloadOf<typeof DocumentRegistered>;
type DomainEvent = EventOf<typeof DocumentRegistered>;
type Envelope = EventEnvelopeOf<typeof DocumentRegistered>;

const event = DocumentRegistered.create({
    documentId: 'document-1',
    storageReference: 'storage-1',
});

const parsed = DocumentRegistered.parse(unknownEvent);
```

`create()` validates the payload and supplies the contract name/version. `parse()` validates an unknown Event against the exact contract identity and payload schema. The Zod output type is the payload type carried by the resulting Event.

`schemaVersion` is the business event-contract version. It is not a Schema Registry subject version or schema ID.

The runtime contract is additive: existing TypeScript-only `Event<name, schemaVersion, payload>` users remain supported, and contract-derived Events are structurally compatible with that boundary.

## API

- `Event`, `AnyEvent` — domain event contracts.
- `EventContract` and `defineEventContract` — Zod-backed runtime Event contract definition, validation, and construction.
- `EventPayloadOf`, `EventOf`, `EventEnvelopeOf` — types inferred from an Event contract.
- `EventId` and `DefaultEventIdFactory` — deterministic event identity contracts and default factory.
- `EventEnvelope`, `AnyEventEnvelope` — event plus metadata envelope.
- `EventActor` and `EventSubject` — envelope metadata contracts.

## Role

Operations may produce events as part of their result. Operations do not publish them. Runner persists event envelopes to the Outbox through the execution pipeline.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

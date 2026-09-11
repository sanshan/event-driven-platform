# Event contracts and portable schema rendering

Status: **Stable / implemented**

EDP supports one runtime Event contract as the business source of truth for Event identity and payload structure, with three independent payload-schema renderers.

```text
business package
    |
    +-- EventContract
        name + business schemaVersion + Zod payload
            |
            +-- TypeScript inference
            +-- runtime validation / Event construction
            +-- JSON Schema renderer
            +-- Avro renderer (+ Avro-only names/namespace)
            +-- Protobuf renderer (+ Proto-only names/field numbers)

future messaging/registry work (not this architecture)
    renderer output + EventContract identity -> registry / serializer / broker
```

The purpose of this capability is to prevent a business payload type, runtime validator, and external schema from becoming separately editable definitions that can drift.

## Event and EventContract

`Event<TName, TSchemaVersion, TPayload>` remains the structural EDP Event value consumed by existing execution and envelope boundaries. `EventContract` is an additive runtime contract that owns:

- the literal Event `name`;
- the literal business `schemaVersion`;
- the Zod payload schema.

`defineEventContract()` creates that contract. `contract.create(payload)` validates the payload and constructs an Event without requiring callers to repeat its name or version. `contract.parse(value)` validates an unknown Event against the exact name, exact business schema version, and payload schema.

Contract-created Events remain structurally compatible with the existing `Event` interface. Existing TypeScript-only Event users are not required to migrate merely because runtime contracts exist.

## Zod is the source of truth

The contract's Zod **output** type is authoritative for the payload carried by an EDP Event.

From one contract value TypeScript can derive:

- `EventPayloadOf<TContract>`;
- `EventOf<TContract>`;
- `EventEnvelopeOf<TContract>`.

No generated TypeScript source or separately maintained payload interface is required.

The same Zod schema is used for runtime validation. Schema renderers consume that contract rather than accepting a second handwritten JSON Schema, Avro schema, or Protobuf type declaration.

JSON Schema uses Zod's public `z.toJSONSchema()` conversion directly. Avro and Protobuf also use the public Zod output-side conversion as an internal normalization bridge, then apply their own deliberately small format mapping. They do **not** depend on the JSON Schema renderer package, so the normalized representation is not a second editable business schema.

## Renderer boundary

The three renderer packages are independent:

```text
@event-driven-platform/event-schema-json     ---> @event-driven-platform/event
@event-driven-platform/event-schema-avro     ---> @event-driven-platform/event
@event-driven-platform/event-schema-protobuf ---> @event-driven-platform/event
```

`@event-driven-platform/event` has no renderer dependency, and no renderer depends on another renderer.

Each renderer returns the schema for the **Event payload**. Renderer results do not wrap or duplicate Event `name` and `schemaVersion` merely for association. The contract already owns that business identity.

This architecture does not define an `EventEnvelope` wire schema or decide whether a future broker value contains an envelope, payload, headers, or another framing. Those are future messaging/transport decisions.

## Portable v1 core

The structural subset intentionally supported by all three renderers is small:

- root object;
- nested object;
- string;
- boolean;
- ordinary number;
- explicit signed 32-bit integer (`z.int32()`);
- arrays of supported required, non-nullable values.

Use this subset when one Event payload must be rendered unchanged into every v1 format.

## Verified support matrix

| Capability | JSON Schema | Avro v1 | Protobuf v1 |
| --- | --- | --- | --- |
| object / nested object | supported | record / nested record | message / nested message |
| string | supported | `string` | `string` |
| boolean | supported | `boolean` | `bool` |
| ordinary number | supported | `double` | `double` |
| explicit signed int32 | supported | `int` | `int32` |
| array | supported | array of supported values | `repeated` for supported required/non-nullable values |
| finite string enum | supported | enum only when values are already valid unchanged Avro symbols | unsupported |
| optional field | supported | unsupported | singular scalar/message only where proto3 presence is faithful |
| nullable value | supported | union containing `null` | unsupported |
| generic integer such as `z.int()` | supported by Zod JSON Schema conversion | unsupported; width is not guessed | unsupported; width is not guessed |

The asymmetry is intentional. JSON Schema, Avro, and Protocol Buffers have different type and presence systems; v1 does not invent translation policy merely to make the table symmetrical.

## Format-local metadata

Format metadata stays outside `EventContract` and never repeats payload field types.

### Avro

The Avro renderer receives:

- required root record name;
- optional namespace.

Nested record and enum names are generated deterministically. Invalid or colliding names fail instead of silently renaming business fields or enum values.

### Protobuf

The Protobuf renderer receives:

- required root message name;
- optional package name;
- explicit field-number mapping by payload path.

Every rendered field has an explicit stable number. Numbers are never allocated from Zod property traversal order. Missing, duplicate within a message, illegal, or Protocol Buffers reserved-range numbers fail. Fields are emitted in numeric order and nested messages in canonical order, so declaration reordering does not renumber fields or change schema output.

Payload field names are preserved. Collisions in their implicit ProtoJSON names, such as `foo_bar` and `fooBar`, fail rather than introducing an implicit `json_name` rewrite.

## Fail closed

A renderer must reject a shape it cannot represent faithfully inside its documented v1 boundary. It must not silently:

- widen an unsupported value to `any` or an unconstrained schema;
- guess integer width;
- reinterpret optional as nullable;
- invent null or presence semantics;
- rename payload fields or business enum values;
- discard unsupported runtime constraints while claiming equivalent representation.

Representative runtime-only transforms/custom types, arbitrary unions, recursion, maps/records where not implemented, incompatible names/values, generic integer widths, and format-specific unsupported optional/nullable forms remain outside the portable core.

JSON Schema relies on Zod's fail-closed first-party conversion for unrepresentable runtime-only constructs. Avro and Protobuf additionally reject normalized shapes or keywords outside their explicit shallow mapping.

## One contract, three renderers

The following example stays inside the true portable core. The payload is declared once and is then used for TypeScript inference, runtime Event validation/construction, and all three schema formats.

```ts
import {
    defineEventContract,
    type EventEnvelopeOf,
    type EventOf,
    type EventPayloadOf,
} from '@event-driven-platform/event';
import { renderEventContractAvroSchema } from '@event-driven-platform/event-schema-avro';
import { renderEventContractJsonSchema } from '@event-driven-platform/event-schema-json';
import { renderEventContractProtobufSchema } from '@event-driven-platform/event-schema-protobuf';
import { z } from 'zod';

const DocumentIndexed = defineEventContract({
    name: 'documents.indexed',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        searchable: z.boolean(),
        confidence: z.number(),
        attempt: z.int32(),
        tags: z.array(z.string()),
        source: z.object({
            system: z.string(),
        }),
    }),
});

type DocumentIndexedPayload = EventPayloadOf<typeof DocumentIndexed>;
type DocumentIndexedEvent = EventOf<typeof DocumentIndexed>;
type DocumentIndexedEnvelope = EventEnvelopeOf<typeof DocumentIndexed>;

const event: DocumentIndexedEvent = DocumentIndexed.create({
    documentId: 'document-1',
    searchable: true,
    confidence: 0.98,
    attempt: 1,
    tags: ['invoice'],
    source: {
        system: 'extractor',
    },
});

const unknownEvent: unknown = event;
const validatedEvent = DocumentIndexed.parse(unknownEvent);

const jsonSchema = renderEventContractJsonSchema(DocumentIndexed);

const avroSchema = renderEventContractAvroSchema(DocumentIndexed, {
    recordName: 'DocumentIndexed',
    namespace: 'com.example.documents',
});

const protobufSchema = renderEventContractProtobufSchema(DocumentIndexed, {
    messageName: 'DocumentIndexed',
    package: 'example.documents',
    fieldNumbers: {
        documentId: 1,
        searchable: 2,
        confidence: 3,
        attempt: 4,
        tags: 5,
        source: 6,
        'source.system': 1,
    },
});
```

`DocumentIndexedPayload`, `DocumentIndexedEnvelope`, `validatedEvent`, and the three rendered schemas all originate from the same contract. Avro and Protobuf metadata describe only requirements specific to those formats; neither duplicates payload field types.

## Business schema version versus Registry identity

`EventContract.schemaVersion` is the business Event-contract version. It is part of the Event identity validated by the runtime contract.

It is **not**:

- a Schema Registry subject version;
- a Registry schema ID;
- a broker topic version;
- a serialization/framing version.

A future Registry integration may combine renderer output with EventContract identity, but Registry-assigned identity and compatibility policy remain infrastructure concerns outside this capability.

## Audit outcome

The implemented v1 capability satisfies these architectural checks:

1. Payload structure is editable in one business place: `EventContract.payload`.
2. Payload, Event, and EventEnvelope TypeScript types derive from the contract without generated TypeScript source.
3. Runtime parsing validates exact Event name, business schema version, and payload through the same contract.
4. Each renderer is independently installable and has no dependency on another renderer format.
5. Unsupported mappings fail instead of silently widening, renaming, or reinterpreting them.
6. Avro naming and Protobuf field numbers remain renderer-local metadata.
7. Protobuf numbers are explicit and stable under property reordering and addition of separately numbered fields.
8. Optional, nullable, enum, and integer differences are intentionally format-specific and documented in the matrix above.
9. The common example uses only the true three-format portable core.
10. No EventEnvelope wire, Registry, serializer, or broker policy is implied by renderer output.
11. No EDP-owned schema AST/IDL, shared cross-format renderer framework, or private Zod dependency is introduced.
12. Renderer outputs remain payload schemas and do not add redundant Event identity wrappers.

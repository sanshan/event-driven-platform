# @event-driven-platform/event-schema-protobuf

Render the payload schema of an EDP runtime `EventContract` as deterministic Protocol Buffers v3 schema source without maintaining a second handwritten business schema.

## Usage

```ts
import { defineEventContract } from '@event-driven-platform/event';
import { renderEventContractProtobufSchema } from '@event-driven-platform/event-schema-protobuf';
import { z } from 'zod';

const DocumentRegistered = defineEventContract({
    name: 'documents.registered',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        attempt: z.int32(),
        tags: z.array(z.string()),
        metadata: z.object({ source: z.string() }),
    }),
});

const proto = renderEventContractProtobufSchema(DocumentRegistered, {
    messageName: 'DocumentRegistered',
    package: 'accounterbro.documents',
    fieldNumbers: {
        documentId: 1,
        attempt: 2,
        tags: 3,
        metadata: 4,
        'metadata.source': 1,
    },
});
```

`messageName`, optional `package`, and `fieldNumbers` are Protobuf-only metadata. They never become generic `EventContract` properties and they do not restate payload field types.

## Field numbers

Every payload field in every message scope requires an explicit stable field number. Nested fields use dot-separated payload paths, for example `metadata.source`.

The renderer never allocates numbers from Zod declaration order. Fields are emitted in numeric order within each message, so reordering object properties does not change numbering or schema output. Numbers must be unique within one message scope, be in the legal `1..536870911` range, and must not use the Protocol Buffers reserved `19000..19999` range.

## v1 mapping

The renderer normalizes the `EventContract` payload through Zod 4's public `z.toJSONSchema()` **output** representation and maps only the shallow subset whose proto3 meaning is explicit:

- root and nested objects -> messages;
- `z.string()` -> `string`;
- `z.boolean()` -> `bool`;
- ordinary `z.number()` -> `double`;
- unconstrained `z.int32()` -> `int32`;
- required arrays of supported non-nullable values -> `repeated`;
- singular optional scalar/message fields -> proto3 `optional`.

Nullable values, finite business string enums, optional arrays, generic integers such as `z.int()`, nested arrays, additional primitive constraints, arbitrary unions, open/catch-all objects, maps/records, recursion, logical/runtime-only types, and unsupported transforms fail explicitly instead of being widened or reinterpreted.

## Naming

Payload field names are preserved exactly and must already be valid Protobuf identifiers. Protobuf grammar keywords are contextual and are not globally banned when they occupy an identifier position. The renderer never renames business fields.

Protobuf also derives a default lower-camel JSON name from every field. Two fields in the same message are rejected when their unchanged Protobuf names would derive the same ProtoJSON name, for example `foo_bar` and `fooBar`. The renderer does not invent `json_name` overrides to bypass such collisions.

Nested message names follow one deterministic rule:

- nested object field: `<root>_<payload path joined by _>_message`;
- object used as an array item: `<root>_<payload path joined by _>_item_message`.

Generated-name collisions fail explicitly rather than being silently changed. Nested message definitions are emitted in canonical order so object declaration order does not change the resulting schema text.

## Boundaries

The returned value is `.proto` schema source for the **payload only**. Event `name` and business `schemaVersion` remain owned by `EventContract`; field numbers are Protobuf wire metadata and are unrelated to the business schema version or any future Schema Registry version/schema ID.

This package does not provide Protobuf code generation, runtime descriptors, binary serialization/deserialization, gRPC/services, Schema Registry integration, broker behavior, compatibility tooling, automatic field-number allocation, or an `EventEnvelope` wire schema. It does not depend on the JSON Schema or Avro renderer packages.

## Related documentation

See [`Event contracts and portable schema rendering`](../../docs/architecture/event-contract-portability.md) for the verified cross-format support matrix and portable-core example.

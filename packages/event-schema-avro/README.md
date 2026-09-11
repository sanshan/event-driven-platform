# @event-driven-platform/event-schema-avro

Render the payload schema of an EDP runtime `EventContract` as a deterministic Apache Avro schema without maintaining a second handwritten business schema.

## Usage

```ts
import { defineEventContract } from '@event-driven-platform/event';
import { renderEventContractAvroSchema } from '@event-driven-platform/event-schema-avro';
import { z } from 'zod';

const DocumentRegistered = defineEventContract({
    name: 'documents.registered',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        attempt: z.int32(),
        tags: z.array(z.string()),
    }),
});

const payloadAvroSchema = renderEventContractAvroSchema(DocumentRegistered, {
    recordName: 'DocumentRegistered',
    namespace: 'com.accounterbro.documents',
});
```

`recordName` is required Avro-specific metadata. `namespace` is optional. Both stay local to this renderer and do not change generic Event semantics.

## v1 mapping

The renderer normalizes the `EventContract` payload through Zod 4's public `z.toJSONSchema()` output representation and then maps only the shallow subset whose Avro meaning is explicit:

- root and nested objects -> named Avro records;
- `z.string()` -> `string`;
- `z.boolean()` -> `boolean`;
- ordinary `z.number()` -> `double`;
- unconstrained `z.int32()` -> `int`;
- arrays of supported values -> Avro arrays;
- nullable supported values -> `['null', valueType]` unions;
- finite string enums -> Avro enums only when every value is already a valid Avro symbol.

Plain optional object fields are unsupported. They are not converted to Avro defaults or nullable fields. Generic integers such as `z.int()` are unsupported because v1 does not guess `int` versus `long`. Additional primitive constraints, arbitrary unions, open/catch-all objects, maps/records, recursive schemas, logical types, and runtime-only Zod constructs outside the shallow subset fail instead of being widened or silently reinterpreted.

## Naming

The root record name is supplied explicitly. Payload field names are preserved exactly and must already be valid Avro names.

Nested named types use one deterministic rule:

- nested record: `<root>_<payload path joined by _>_record`;
- enum: `<root>_<payload path joined by _>_enum`.

For example, `metadata` below root `DocumentRegistered` becomes `DocumentRegistered_metadata_record`. If two payload paths collapse to the same generated Avro name, rendering fails rather than renaming either payload field or named type implicitly.

## Boundaries

The returned value is the **payload schema only**. Event `name` and business `schemaVersion` remain owned by `EventContract`; they are not Schema Registry subjects, Registry versions, or schema IDs.

This package does not provide Avro binary serialization/deserialization, Schema Registry integration, broker behavior, compatibility checks, or an `EventEnvelope` wire schema. It also does not depend on the JSON Schema or Protobuf renderer packages.

## Related documentation

See [`Event contracts and portable schema rendering`](../../docs/architecture/event-contract-portability.md) for the verified cross-format support matrix and portable-core example.

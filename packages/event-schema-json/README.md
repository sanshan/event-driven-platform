# @event-driven-platform/event-schema-json

Render the payload schema of an EDP runtime `EventContract` as JSON Schema from the same Zod schema used for runtime validation and TypeScript inference.

## Usage

```ts
import { defineEventContract } from '@event-driven-platform/event';
import { renderEventContractJsonSchema } from '@event-driven-platform/event-schema-json';
import { z } from 'zod';

const DocumentRegistered = defineEventContract({
    name: 'documents.registered',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        storageReference: z.string(),
    }),
});

const payloadJsonSchema = renderEventContractJsonSchema(DocumentRegistered);
```

The renderer delegates to Zod 4's public `z.toJSONSchema()` conversion and targets JSON Schema Draft 2020-12. Zod's output side is used, matching the payload carried by `EventContract` events. Unrepresentable runtime-only constructs fail instead of being widened to an unconstrained schema.

The v1 guarantees exercised by this package include root and nested objects, strings, booleans, numbers, explicit `int32`, arrays, finite string enums, optional fields, and nullable values where Zod's first-party conversion represents them faithfully.

The result is the **payload schema only**. Event `name` and business `schemaVersion` remain owned by `EventContract`; they are not Schema Registry subjects, Registry versions, or schema IDs. This package does not define an `EventEnvelope` wire format, serialization, broker behavior, or Registry integration.

## Related documentation

See [`Event contracts and portable schema rendering`](../../docs/architecture/event-contract-portability.md) for the verified cross-format support matrix and portable-core example.

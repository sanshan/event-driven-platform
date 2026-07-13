# avsc

avsc is the Node.js / JavaScript implementation used for Apache Avro schemas.

Use avsc for:

- parsing Avro schemas
- validating payloads against Avro schemas
- encoding Avro payloads
- decoding Avro payloads
- working with Avro types in TypeScript/Node.js services

avsc must be treated as a technical library for Avro handling.

## Usage

Prefer loading explicit Avro schema files.

Use `avsc.Type.forSchema(...)` to create runtime Avro types.

Validate payloads before producing messages.

Decode and validate consumed messages before passing data further into application code.

## Validation

Use avsc validation at system boundaries:

- before producing Redpanda messages
- after consuming Redpanda messages
- when processing CDC-derived messages
- when accepting externally supplied Avro payloads

Do not assume TypeScript types alone are enough for runtime validation.

## Encoding and decoding

Use avsc for binary Avro encoding and decoding when required.

Keep serialization logic isolated in infrastructure or contract modules.

Application code should not manually construct low-level Avro buffers.

## TypeScript

TypeScript types and Avro schemas are different layers.

TypeScript provides compile-time safety.
Avro provides runtime contract validation and serialization.

Do not replace Avro validation with TypeScript interfaces.

## Schema loading

Prefer deterministic schema loading.

Avoid dynamic schema construction unless there is a strong reason.

Schema files should be versioned and reviewed.

## Errors

Handle avsc validation and decoding errors explicitly.

Invalid payloads should not silently pass through the system.

Prefer clear error reporting with:

- schema name
- schema version
- validation failure reason
- message/topic context when available

## Boundaries

Keep avsc usage close to messaging and contract boundaries.

Good places:

- contracts package
- Redpanda producer adapter
- Redpanda consumer adapter
- Schema Registry integration layer
- CDC adapter layer

Avoid leaking avsc-specific objects into domain code.

## Agent rules

When generating avsc code:

- use `avsc.Type.forSchema(...)`
- keep schemas explicit
- validate payloads at runtime
- isolate encoding and decoding logic
- do not expose avsc internals to domain code
- do not rely only on TypeScript interfaces
- handle validation errors explicitly
- keep Avro schema files as the source of truth

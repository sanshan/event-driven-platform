# Apache Avro

Apache Avro is used as the schema and serialization format for structured data contracts.

Use Avro for:

* event contracts
* CDC-related message contracts when schema governance is required
* Redpanda topic payload schemas
* Schema Registry integration
* explicit schema evolution

Avro must be treated as a contract format, not as application business logic.

## Schema design

Prefer explicit Avro schemas.

Use:

* `record`
* `enum`
* `array`
* `map`
* `union`
* logical types where appropriate

Prefer stable schema names and namespaces.

Avoid anonymous or unclear schema names.

## Naming

Use clear names for:

* schema name
* namespace
* record fields
* enum symbols

Prefer versioned names only when compatibility cannot be preserved.

Example:

{
"type": "record",
"name": "UserChangedV1",
"namespace": "platform.user.events"
}

## Compatibility

Design schemas for evolution.

Prefer backward-compatible changes:

* adding optional fields with defaults
* widening compatible types only when safe
* keeping existing field names stable
* keeping enum symbols stable

Avoid:

* removing required fields
* renaming fields without aliases
* changing field types incompatibly
* removing enum symbols
* changing semantic meaning of existing fields

## Optional fields

Represent optional fields as union with `null`.

Prefer:

{
"name": "email",
"type": ["null", "string"],
"default": null
}

Avoid optional fields without defaults.

## Defaults

Always provide defaults for newly added fields.

Defaults are important for schema evolution and compatibility.

## Logical types

Use logical types for semantic values.

Common examples:

* `timestamp-millis`
* `timestamp-micros`
* `date`
* `decimal`
* `uuid`

Use logical types only when producers and consumers support them consistently.

## Decimal values

Use Avro decimal logical type for money and precise numeric values.

Avoid floating-point numbers for money.

Prefer:

* `bytes` with `logicalType: decimal`
* explicit `precision`
* explicit `scale`

## Events

Event schemas should be explicit and stable.

Prefer including:

* event id
* event type
* event version
* occurred timestamp
* payload

Do not rely on undocumented payload structures.

## Schema Registry

Use Schema Registry when schemas are shared between services.

Prefer:

* explicit subject naming strategy
* compatibility checks
* schema validation in CI
* schema registration during deployment

Do not register incompatible schemas manually without review.

## Agent rules

When generating Avro schemas:

* use explicit record names
* use namespaces
* use defaults for new fields
* use `["null", T]` for optional fields
* avoid floats for money
* avoid unversioned event contracts
* preserve backward compatibility
* prefer Schema Registry-compatible schemas
* do not put business logic into schemas

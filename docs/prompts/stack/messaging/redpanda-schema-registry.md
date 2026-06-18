# Redpanda Schema Registry

Redpanda Schema Registry is used for schema governance and versioning.

Use Schema Registry for:

* managing Avro schemas
* enforcing schema compatibility
* versioning event contracts
* centralized schema storage
* client schema validation

Schema Registry must be treated as infrastructure for contract management.

## Subject naming

Use consistent subject naming strategies.

Strategies:

* TopicNameStrategy: `{topic}`
* RecordNameStrategy: `{topic}-{record}`
* TopicRecordNameStrategy: `{topic}-{namespace}.{record}`

Choose a strategy and apply consistently across services.

## Compatibility modes

Set compatibility mode intentionally.

Modes:

* BACKWARD: new schema can read old data
* FORWARD: old schema can read new data
* FULL: bidirectional compatibility
* NONE: no compatibility checks

Avoid changing compatibility modes without review.

## Schema registration

Register schemas during deployment.

Practices:

* register before service startup
* fail fast on registration errors
* validate schemas in CI
* version schemas explicitly

## Schema evolution

Design schemas for safe evolution.

Prefer:

* adding optional fields with defaults
* preserving field names and types
* using unions for optional values
* incremental versioning

Avoid:

* removing fields
* renaming fields without aliases
* changing field semantics
* breaking compatibility

## Client validation

Validate against registered schemas.

Practices:

* validate on produce
* validate on consume
* handle validation errors explicitly
* log schema mismatches

## Observability

Monitor schema usage.

Track:

* schema registration events
* schema version changes
* compatibility violations
* validation failures

## Agent rules

When working with Redpanda Schema Registry:

* use consistent subject naming
* set compatibility mode intentionally
* register schemas before service startup
* validate schemas in CI/CD
* avoid compatibility violations
* design schemas for evolution
* validate payloads against schemas
* handle schema registration errors
* monitor schema changes


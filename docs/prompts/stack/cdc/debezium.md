# Debezium

Debezium is used for Change Data Capture (CDC) to stream database changes.

Use Debezium for:

* PostgreSQL CDC from transaction logs
* streaming table snapshots
* event-driven data pipelines
* outbox pattern implementation
* read model synchronization
* cache warmup

Debezium must be treated as infrastructure for data streaming.

## PostgreSQL connector

Use PostgreSQL Logical Decoding.

Configuration:

* logical replication enabled
* pgoutput decoding plugin
* explicit replication slots
* explicit publications
* specific table/schema includes

Avoid database-wide capture unless necessary.

## Replication slots

Manage replication slots carefully:

* create explicit slots
* track slot lag
* clean up unused slots
* prevent slot accumulation

Slots protect WAL segments from cleanup.

## Publications

Define publications explicitly:

* include only required tables
* specify schema requirements
* use clear publication names
* manage schema evolution

Publications control what gets captured.

## Snapshot mode

Choose snapshot strategy:

* initial: capture initial table state
* no data: skip initial snapshot
* when_needed: snapshot if needed

Snapshots affect startup time and network load.

## Serialization

Prefer Avro with Schema Registry.

Serialization options:

* Avro for versioned contracts
* JSON for simple structures
* protobuf when appropriate

Match downstream consumer expectations.

## Topic naming

Use clear, stable topic names.

Pattern:

* `{database}.{schema}.{table}` for raw CDC
* `{domain}.{entity}.{event-type}` after transformation
* Avoid temporary or generated names

Topic names should describe content clearly.

## Outbox event router

Use for transactional guarantees.

Outbox flow:

* application writes outbox record in transaction
* Debezium captures outbox changes
* SMT (Single Message Transform) extracts payload
* events published to domain topics

Ensures exactly-once delivery.

## Single Message Transform (SMT)

Use SMTs for:

* outbox extraction
* field mapping
* envelope routing
* schema enrichment

SMTs transform captured data before publishing.

## Error handling

Handle failures gracefully:

* connector restarts
* poison message handling
* error logging and alerting
* recovery procedures

Monitor connector health.

## Monitoring

Track Debezium health:

* capture lag
* connector status
* failed transformations
* processing rate
* replication slot lag

Health should be observable.

## Schema evolution

Handle database schema changes:

* compatibility checking
* schema versioning
* migration safety
* downstream validation

Schema changes must not break consumers.

## Performance tuning

Optimize performance:

* batch size configuration
* max.batch.size
* poll.interval.ms
* snapshot sampling

Balance throughput and latency.

## Reliability

Ensure reliable capture:

* persistent connectors
* automatic retries
* idempotent consumers
* offset management

Data loss should not occur.

## Integration with downstream

Connect to Redpanda:

* configure Redpanda connector
* map topics appropriately
* handle partitioning
* manage retention

Ensure consumer compatibility.

## Agent rules

When working with Debezium CDC:

* use PostgreSQL logical replication
* define publications explicitly
* use Avro with Schema Registry for shared contracts
* implement outbox pattern for transactional guarantees
* use SMTs for payload transformation
* name topics clearly
* monitor connector lag and health
* handle schema evolution gracefully
* design for idempotent consumption
* ensure exactly-once semantics where required
* test connector behavior
* plan recovery procedures


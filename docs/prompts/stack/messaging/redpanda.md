# Redpanda

Redpanda is the Kafka-compatible streaming platform used for messaging.

Use Redpanda for:

- event streaming
- Kafka-compatible topics
- producers
- consumers
- consumer groups
- partitions
- offsets
- retention
- compaction
- Schema Registry integration
- CDC event transport

Redpanda must be treated as infrastructure messaging, not as application business logic.

## Topic design

Design topics intentionally.

For each topic, define:

- purpose
- key format
- value format
- partitioning strategy
- retention policy
- compaction policy
- expected producers
- expected consumers
- ordering requirements

Do not create topics without understanding their lifecycle.

## Topic naming

Use explicit and stable topic names.

Prefer names that describe the data stream purpose.

Avoid:

- temporary topic names in production
- ambiguous topic names
- names coupled to implementation details unless intentional

## Partitioning

Choose message keys carefully.

Message keys affect:

- partition placement
- ordering
- compaction
- consumer scalability

Use stable keys when ordering per entity is required.

Do not use random keys when per-entity ordering is required.

Do not use a single hot key for high-volume streams.

## Ordering

Redpanda provides ordering within a partition.

Do not assume global ordering across partitions.

If order matters, ensure all related messages use the same key.

Consumers must be designed for partition-level ordering only.

## Producers

Producers must be explicit about:

- topic
- key
- value
- headers
- serialization
- retry behavior
- timeout behavior
- idempotency where supported

Do not produce messages with unclear keys.

Do not produce unversioned payloads for shared topics.

## Idempotent producers

Use idempotent producers when supported and appropriate.

Idempotent producers help avoid duplicate writes caused by producer retries.

Do not treat producer idempotency as a replacement for consumer idempotency.

## Consumers

Consumers must be idempotent.

A message may be processed more than once.

Design consumers to handle:

- duplicate messages
- retries
- rebalances
- partial failures
- poison messages
- delayed processing
- out-of-order messages across partitions

Do not assume exactly-once application behavior by default.

## Consumer groups

Use consumer groups intentionally.

Same consumer group:

- shares topic partitions
- scales one logical workload

Different consumer groups:

- receive independent copies of the stream
- represent independent workloads

Do not reuse a consumer group for unrelated processing.

## Offsets

Offset commits must match processing semantics.

Commit offsets only after successful processing when correctness requires it.

Avoid committing offsets before durable side effects are completed.

Handle reprocessing safely.

## Retention

Set retention according to data lifecycle.

Consider:

- replay requirements
- storage cost
- regulatory needs
- consumer outage tolerance
- recovery strategy

Do not rely on infinite retention unless explicitly required.

## Compaction

Use compacted topics for latest-state streams.

Good use cases:

- snapshots
- infrastructure state
- cache warmup
- key-value style streams

Compacted topics require stable message keys.

Do not use compaction for event history where every event must be preserved.

## Tombstones

Use tombstone records intentionally for compacted topics.

A tombstone is a record with a key and null value.

Consumers must know whether tombstones are expected.

Do not emit tombstones accidentally.

## Serialization

Use explicit serialization.

Prefer:

- Avro for governed shared contracts
- Schema Registry for compatibility control
- JSON only when schema governance is not required

Do not mix serialization formats within the same topic family.

## Schema Registry

Use Schema Registry for shared contracts.

Define:

- subject naming strategy
- compatibility mode
- schema versioning approach
- producer validation
- consumer validation

Do not publish incompatible schema changes without review.

## Headers

Use headers for metadata, not primary payload data.

Good header candidates:

- correlation id
- causation id
- trace id
- schema version
- source service

Do not put important business payload only in headers.

## Retries

Handle retries explicitly.

Consider:

- producer retries
- consumer retries
- retry topics
- dead-letter topics
- poison message handling
- backoff policy

Do not retry endlessly without limits.

## Dead-letter topics

Use dead-letter topics for messages that cannot be processed safely.

Dead-letter records should include:

- original topic
- original partition
- original offset
- failure reason
- failure timestamp
- consumer name

Do not silently drop failed messages.

## Backpressure

Design for backpressure.

Consumers must not overload:

- databases
- external APIs
- caches
- downstream services

Use:

- concurrency limits
- batching
- pause/resume where supported
- rate limits where needed

## CDC streams

CDC streams require careful topic design.

For CDC topics, define:

- source table or source stream
- key format
- delete behavior
- tombstone behavior
- snapshot behavior
- compaction policy
- retention policy
- schema evolution approach

Do not expose raw CDC envelopes to application code unless intentionally required.

## High-load rules

For high-load Redpanda usage:

- choose partition keys carefully
- avoid hot partitions
- avoid oversized messages
- avoid unbounded consumer concurrency
- avoid slow consumers without monitoring
- monitor consumer lag
- monitor broker disk usage
- monitor partition skew
- monitor produce and consume latency
- validate topic retention and compaction settings

## Observability

Monitor:

- consumer lag
- broker health
- partition count
- partition skew
- topic throughput
- produce latency
- consume latency
- under-replicated partitions
- disk usage
- storage growth
- failed messages
- rebalance frequency

Messaging failures must be visible.

## Agent rules

When generating Redpanda-related code or configuration:

- treat Redpanda as Kafka-compatible messaging infrastructure
- define topic purpose before using it
- always choose message keys intentionally
- do not assume ordering across partitions
- keep consumers idempotent
- commit offsets according to processing semantics
- use compacted topics only for latest-state streams
- use retention intentionally
- use tombstones intentionally
- use Avro and Schema Registry for governed shared contracts
- do not mix serialization formats accidentally
- do not silently drop failed messages
- design retry and dead-letter handling explicitly
- limit consumer concurrency
- monitor consumer lag
- avoid hot partitions
- avoid oversized messages
- do not put business logic into messaging adapters

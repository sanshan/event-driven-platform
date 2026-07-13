# PostgreSQL

PostgreSQL is the primary relational database.

Use PostgreSQL for:

- transactional storage
- relational consistency
- high-load write paths
- high-load read paths
- indexes
- constraints
- transactions
- row-level locking
- concurrency control
- CDC source tables
- outbox storage

PostgreSQL must be treated as a core stateful infrastructure component.

## General rules

Prefer correctness first.

Database design must account for:

- high load
- concurrent writes
- race conditions
- idempotency
- data consistency
- index quality
- query plans
- migration safety
- observability

Do not generate database code that only works for small datasets.

Always consider how the query behaves when the table has millions or billions of rows.

## Schema design

Prefer explicit schemas.

Use:

- primary keys
- foreign keys
- unique constraints
- check constraints
- not-null constraints
- explicit indexes

Do not rely only on application-level validation.

Use database constraints for invariants that must never be violated.

## Data types

Prefer PostgreSQL-native types.

Use:

- `uuid` for UUID values
- `timestamptz` for timestamps
- `numeric` for precise monetary or decimal values
- `text` instead of arbitrary `varchar(n)` unless length limit is a real rule
- `bigint` for high-volume generated identifiers when appropriate
- `jsonb` only when relational modeling is not suitable

Avoid:

- `timestamp without time zone`
- floating-point types for money
- unnecessary `varchar(255)`
- storing dates as strings
- unbounded JSON usage for structured relational data

## Indexes

Indexes must be designed from query patterns.

For every important query, check:

- filter columns
- join columns
- ordering columns
- pagination columns
- uniqueness requirements
- expected cardinality
- selectivity

Add indexes for:

- foreign key columns
- frequently filtered columns
- frequently joined columns
- unique business keys
- idempotency keys
- outbox polling fields
- status + created_at query patterns
- tenant_id + entity_id query patterns

Avoid:

- unused indexes
- duplicate indexes
- indexes on low-cardinality columns alone
- over-indexing write-heavy tables
- creating indexes without knowing the query pattern

For compound indexes, column order matters.

Prefer indexes that match actual query predicates.

## Query performance

Every non-trivial query should be explainable.

Use `EXPLAIN` / `EXPLAIN ANALYZE` for important queries.

Check:

- sequential scans on large tables
- nested loops on large result sets
- sort operations
- hash joins
- index usage
- row estimates
- actual rows
- memory usage
- lock behavior

Do not assume an index is used just because it exists.

## High-load writes

Write paths must be safe under concurrency.

Use:

- transactions
- unique constraints
- atomic updates
- optimistic concurrency where appropriate
- row-level locks where appropriate
- deterministic idempotency keys

Avoid read-before-write races.

Prefer atomic database operations over multi-step application checks.

Bad pattern:

```text
SELECT ...
IF NOT EXISTS THEN INSERT ...
```

Better pattern:

```text
INSERT ...
ON CONFLICT ...
```

## Race conditions

Always consider concurrent execution.

For critical flows, define what happens when:

- the same request is retried
- two requests update the same row
- two workers process the same item
- a transaction is rolled back
- a consumer receives the same message twice
- a timeout happens after commit

Use database constraints to prevent impossible states.

Do not rely on timing assumptions.

## Transactions

Keep transactions short.

Do not perform external calls inside database transactions.

Do not keep transactions open while waiting for:

- network calls
- message broker acknowledgements
- user input
- long computations

Use transactions for atomic state changes only.

## Locking

Use row-level locks intentionally.

Use `SELECT ... FOR UPDATE` only when needed.

Consider:

- lock duration
- lock ordering
- deadlock risk
- retry behavior
- worker concurrency
- blocked queries

For job-like processing, consider `FOR UPDATE SKIP LOCKED`.

Do not introduce locks without understanding contention.

## Idempotency

Use deterministic idempotency keys for retryable operations.

Store idempotency state in PostgreSQL when correctness depends on it.

Prefer unique constraints on idempotency keys.

Repeated execution with the same idempotency key must return the previously recorded result or safely no-op.

## Outbox

Use PostgreSQL as the transactional outbox storage when atomic write + event delivery is required.

The outbox record must be written in the same transaction as the state change.

Do not publish messages directly from the transaction path when outbox is required.

Outbox tables should have indexes for:

- unpublished records
- status
- created_at
- aggregate identifiers when needed
- event identifiers

## CDC

Captured tables should be designed carefully.

For CDC-related tables:

- keep primary keys stable
- avoid unnecessary updates
- avoid noisy columns when possible
- keep payload shape explicit
- consider replication slot impact
- consider WAL volume
- consider schema evolution

Do not make uncontrolled schema changes on CDC source tables.

## Migrations

Migrations must be production-safe.

Before generating migrations, consider:

- table size
- lock level
- rewrite risk
- index creation time
- backfill strategy
- rollback strategy
- compatibility with running application versions

Prefer:

- additive changes first
- nullable column first, then backfill, then not-null
- concurrent index creation for large tables
- small batched backfills
- explicit rollback notes

Avoid:

- long exclusive locks
- table rewrites on large tables
- destructive changes without migration plan
- changing column types blindly

## Pagination

Avoid offset pagination on large datasets.

Prefer keyset pagination.

Use stable ordering columns.

Common pattern:

- `created_at`
- `id`
- `(created_at, id)`

Indexes must support pagination order.

## Multi-tenant queries

For tenant-scoped data, include `tenant_id` in important indexes.

Prefer compound indexes that match tenant-scoped access patterns.

Example:

- `(tenant_id, user_id)`
- `(tenant_id, status, created_at)`
- `(tenant_id, external_id)`

Do not scan global tables when the query is tenant-scoped.

## Observability

Important database behavior must be observable.

Track:

- slow queries
- lock waits
- deadlocks
- connection pool saturation
- index usage
- table bloat
- WAL growth
- replication lag
- transaction duration
- migration duration

Do not optimize blindly.

## Agent rules

When generating PostgreSQL schema, SQL, migrations or Prisma models:

- think about high-load behavior
- think about race conditions
- use database constraints for correctness
- add indexes based on real query patterns
- index foreign keys explicitly when they are used for joins or deletes
- avoid unnecessary `varchar(255)`
- avoid floats for money
- prefer `timestamptz`
- avoid offset pagination for large data
- prefer atomic writes over read-before-write checks
- use `ON CONFLICT` where appropriate
- keep transactions short
- do not perform external calls inside transactions
- make migrations safe for large tables
- check query plans for important queries
- avoid leaking database concerns into domain logic

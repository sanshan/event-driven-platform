# Prisma ORM

Prisma ORM is used as the TypeScript database access layer for PostgreSQL.

Use Prisma for:

* type-safe database access
* Prisma schema modeling
* migrations
* generated Prisma Client
* transactional database operations
* explicit PostgreSQL type mapping

Prisma must be treated as a database access tool, not as a place for business logic.


## Schema design

Prisma models must reflect PostgreSQL intentionally.

Prefer explicit native PostgreSQL mappings.

Use:

* `String @db.Uuid` for UUID fields
* `DateTime @db.Timestamptz(...)` for timestamps
* `Decimal @db.Decimal(precision, scale)` for precise decimal values
* `BigInt` for large integer identifiers
* `Json` only when relational modeling is not suitable

Avoid:

* implicit database types for important fields
* floats for money or exact decimal values
* unnecessary `String @db.VarChar(255)`
* storing timestamps as strings
* overusing `Json`

## Decimal values

Use Prisma `Decimal` for precise monetary and decimal values.

Prefer explicit PostgreSQL mapping:

```prisma
amount Decimal @db.Decimal(38, 18)
```

Do not use:

* `Float` for money
* JavaScript `number` for exact decimal calculations
* implicit decimal precision for important financial fields

Keep decimal handling explicit in application code.

## IDs

Prefer UUIDs for distributed entity identifiers.

Example:

```prisma
id String @id @default(uuid()) @db.Uuid
```

Use deterministic unique keys for idempotency and external references.

Do not depend on auto-increment IDs when distributed ID generation is required.

## Constraints

Use database constraints for correctness.

Prefer:

* `@id`
* `@unique`
* `@@unique`
* required fields
* relations with foreign keys
* explicit relation names when needed

Do not rely only on application checks for invariants that must never be violated.

## Indexes

Indexes must follow real query patterns.

Use:

* `@@index`
* `@@unique`
* compound indexes
* explicit index names when useful

Add indexes for:

* foreign keys used in joins
* tenant-scoped queries
* status + createdAt queries
* idempotency keys
* outbox polling fields
* external identifiers
* pagination fields

Avoid:

* unused indexes
* duplicate indexes
* low-cardinality single-column indexes
* over-indexing write-heavy tables

Column order matters in compound indexes.

## Query design

Do not generate Prisma queries without thinking about SQL behavior.

For high-load paths, consider:

* expected table size
* index usage
* join shape
* selected fields
* pagination strategy
* transaction boundaries
* lock behavior
* N+1 queries

Prefer `select` over loading entire records when only a few fields are needed.

Avoid unbounded `findMany`.

Always use:

* `where`
* `take`
* stable ordering
* cursor/keyset pagination when data can grow large

## Pagination

Avoid offset pagination on large datasets.

Prefer cursor-based pagination.

Use stable unique ordering.

Common ordering:

* `createdAt`
* `id`
* `(createdAt, id)`

Make sure indexes support the pagination query.

## Transactions

Use Prisma transactions for atomic database changes.

Use:

* nested writes for simple dependent writes
* `$transaction([])` for independent operations
* interactive transactions only when necessary

Keep transactions short.

Do not perform external calls inside transactions.

Avoid long-running interactive transactions.

## Race conditions

Always design write logic for concurrent execution.

Avoid read-before-write races.

Prefer:

* unique constraints
* atomic updates
* `upsert` where appropriate
* `createMany({ skipDuplicates: true })` where appropriate
* optimistic concurrency with a version field where appropriate
* idempotency tables or unique idempotency keys for retryable operations

Do not assume that two requests cannot happen at the same time.

## Optimistic concurrency

Use optimistic concurrency control when multiple writers can update the same record.

Prefer a version field:

```prisma
version Int @default(0)
```

Update with a guarded condition and increment the version atomically.

The update must fail or affect zero rows when the version is stale.

Handle the conflict explicitly.

## Atomic updates

Use atomic number operations when possible.

Examples:

* `increment`
* `decrement`
* `multiply`
* `divide`

Do not read a numeric value, modify it in application code, and write it back when an atomic update is possible.

## Raw SQL

Use raw SQL only when Prisma cannot express the required query safely or efficiently.

Prefer:

* `$queryRaw`
* `$executeRaw`

Avoid unsafe raw SQL.

Do not use raw SQL to bypass schema design or transaction rules.

Raw SQL must still follow PostgreSQL indexing, locking and migration best practices.

## Migrations

Prisma migrations must be safe for production-sized PostgreSQL tables.

Before creating migrations, consider:

* table size
* lock duration
* index creation strategy
* backfill strategy
* rollback strategy
* compatibility with running services
* CDC impact

Prefer additive migrations:

1. add nullable column
2. deploy application support
3. backfill in batches
4. add constraint
5. remove old column later

Avoid destructive migrations without an explicit plan.

## High-load rules

For high-load code paths:

* avoid unbounded queries
* avoid N+1 queries
* avoid unnecessary relations
* avoid loading large JSON fields
* avoid long transactions
* avoid write amplification from excessive indexes
* avoid `count` on huge filtered datasets unless needed
* avoid offset pagination
* check generated SQL for critical queries

Use query logging and database observability for important paths.

## Agent rules

When generating Prisma code:

* check official Prisma AI documentation first
* keep Prisma usage outside domain logic
* model PostgreSQL types explicitly
* use `Decimal @db.Decimal(...)` for money and exact decimals
* avoid `Float` for money
* use `DateTime @db.Timestamptz(...)`
* define indexes from query patterns
* use constraints for correctness
* make retryable operations idempotent
* avoid read-before-write races
* keep transactions short
* do not call external services inside transactions
* avoid unbounded `findMany`
* prefer cursor pagination for large tables
* use `select` for narrow reads
* handle concurrency conflicts explicitly
* make migrations safe for large tables

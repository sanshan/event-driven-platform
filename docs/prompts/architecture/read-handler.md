# Read Handler

Read Handler retrieves data from a single source.

Read Handlers implement read behavior.

Read Handlers are business-aware but infrastructure-specific.

## Responsibilities

Read Handlers are responsible for:

* reading data
* mapping data
* producing Read Result

Each Read Handler should access only one source.

Examples:

* L1 Cache Handler
* Redis Handler
* PostgreSQL Handler
* ClickHouse Handler
* Elasticsearch Handler

## Single-source rule

A Read Handler must read from only one source.

Bad:

L1 Cache
→ Redis
→ PostgreSQL

inside a single handler.

Good:

L1 Cache Handler

Redis Handler

PostgreSQL Handler

Reader orchestrates traversal.

## Results

Read Handlers return Read Results.

Possible outcomes:

* hit
* miss

Handlers do not decide what happens next.

Reader interprets the result.

## Cache updates

Read Handlers never update caches.

Read Handlers never invoke Cache Writers.

Cache population belongs to Reader.

## Forbidden responsibilities

Read Handlers must not:

* update caches
* call other handlers
* perform orchestration
* contain retry logic
* contain cache traversal logic

## Design rules

Read Handlers should:

* remain small
* remain deterministic
* access one source only
* return explicit Read Results

# Reader

Reader is the centralized read execution engine.

Reader executes Queries.

Reader owns read-side execution concerns.

Reader is infrastructure-oriented.

## Responsibilities

Reader is responsible for:

* query execution
* handler resolution
* cache traversal
* cache population orchestration
* read observability
* read result assembly

## Execution flow

Query
→ Reader
→ Read Handler
→ Read Result
→ Cache Writers

## Handler resolution

Reader determines which handlers should be executed.

Reader controls traversal order.

Reader decides when execution should stop.

Read Handlers do not call each other.

## Cache traversal

Reader may execute multiple handlers.

Typical example:

L1 Cache
→ Redis
→ Database

Reader moves through handlers until data is found.

## Cache population

Reader invokes Cache Writers.

Read Handlers never write caches.

Reader coordinates cache population after successful reads.

## Forbidden responsibilities

Reader must not:

* contain business logic
* contain domain rules
* implement read behavior itself

Read behavior belongs to Read Handlers.

## Design rules

Reader should provide:

* deterministic execution
* observability
* cache orchestration
* reusable read pipelines

All reads execute through Reader.

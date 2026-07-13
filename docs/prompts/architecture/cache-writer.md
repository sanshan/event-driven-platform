# Cache Writer

Cache Writer updates cache layers.

Cache Writers are independent from Read Handlers.

Cache writing and cache reading must remain separated.

## Responsibilities

Cache Writers are responsible for:

- cache population
- cache refresh
- cache update
- cache invalidation

Cache Writers never read data.

## Execution

Cache Writers are invoked by Reader.

Typical flow:

PostgreSQL Handler
→ Read Result
→ Reader
→ Redis Cache Writer
→ L1 Cache Writer

## Separation of concerns

Read Handler:

- reads data

Cache Writer:

- writes cache

These responsibilities must not be combined.

## Cache layers

Examples:

- L1 Cache Writer
- Redis Cache Writer

Each writer owns one cache layer.

## Invalidation

Cache Writers may perform:

- delete
- update
- replace
- refresh

depending on cache strategy.

## Forbidden responsibilities

Cache Writers must not:

- query databases
- query ClickHouse
- query external services
- orchestrate reads

Cache Writers only write cache state.

## Design rules

Cache Writers should:

- be idempotent
- be deterministic
- own a single cache layer
- remain infrastructure-focused

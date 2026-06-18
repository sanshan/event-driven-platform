# Redis

Redis is used as:

- Distributed cache
- L1/L2 cache support
- Rate limiting
- Temporary infrastructure state
- Distributed coordination when explicitly required

Redis is not a source of truth.

## Usage

Redis is infrastructure.

Redis may be used for:

- Cache
- Rate limiting
- Distributed locks
- Temporary execution state

Redis must not be used for:

- Domain storage
- Execution log storage
- Outbox storage
- Aggregate persistence

## Data structures

Understand:

- Strings
- Hashes
- Sets
- Sorted Sets
- Streams
- Pub/Sub
- Lua Scripts
- Pipelines
- Transactions

## Patterns

Implement:

- Expiration and TTL
- Rate limiting
- Cache invalidation
- Clustering and Sentinel for HA

## Agent rules

When working with Redis:

- use for caching, rate limiting, distributed locks
- do not use as primary storage or outbox
- manage expiration and TTL carefully
- handle cache invalidation explicitly
- design for distributed environments
- do not put business logic into Redis operations

# @event-driven-platform/query

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Defines the current `Query` transport and declarative read-execution configuration contracts for the incomplete read side.

## Role

`Query` carries a `Read` together with read-execution options and context. It is intentionally separate from the business-oriented Read itself.

A Query may optionally describe an ordered cache plan. The plan is declarative only: Query does not read caches, write caches, traverse levels, or execute source handlers.

The repository does not yet contain a complete read execution engine. This README describes only contracts that exist today and does not document planned Reader behavior as implemented architecture.

## API

- `Query` — current read transport contract; its options preserve the associated Read result type.
- `QueryOptions` — current execution-option contract, including optional timeout and cache plan.
- `QueryContext` — current query context contract.
- `ReadCacheKey` — explicit semantic cache/read identity composed of namespace, version, partition and value.
- `QueryCachePlan` / `QueryCacheLevels` — non-empty ordered cache-level declaration.
- `QueryCacheLevel` — one cache source with explicit `local` or `shared` visibility, one reader, and an optional separate writer.
- `CacheReader` / `CacheWriter` — technology-neutral, separate read and write capabilities typed to the Query result.
- `CacheReadResult` — explicit `hit`, `miss`, or `error` cache-read outcome.

## Cache identity

`ReadCacheKey` deliberately keeps semantic identity components separate rather than prescribing ad-hoc concatenated strings:

```ts
const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};
```

Consumers are responsible for choosing deterministic values that include the security/tenant partition relevant to the Read semantics. Serialization into a concrete cache or coordination key belongs to later infrastructure, not to Read itself.

## Architectural boundary

Query contains no business logic and must not collapse into Read.

Cache readers do not write. Cache writers are separate capabilities. These contracts describe possible execution inputs only; no Reader, handler resolution, cache traversal, backfill, in-flight coordination, Redis, or InMemory implementation is provided by this package today.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

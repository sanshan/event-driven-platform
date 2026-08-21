# @event-driven-platform/query

Defines the transport and declarative execution configuration for the stable Read pipeline.

## Role

`Query<TRead>` carries a business `Read`, caller context, and optional execution options. Query describes execution policy but performs no execution itself.

```ts
import type { Query } from '@event-driven-platform/query';

const query: Query<GetUserRead> = {
    read: {
        name: 'user.get',
        actor,
        parameters: { userId: 'user-42' },
    },
    context: {
        correlationId: 'request-123',
    },
    options: {
        timeoutMs: 2_000,
    },
};
```

## Cache plans

A Query may declare an ordered cache topology:

```ts
const cache = {
    key: {
        namespace: 'user.get',
        version: '1',
        partition: 'tenant:tenant-1',
        value: 'user:user-42',
    },
    levels: [
        { scope: 'local', reader: l1, writer: l1 },
        { scope: 'shared', reader: l2, writer: l2 },
    ],
    coordination: {
        leaseDurationMs: 1_000,
    },
} satisfies QueryCachePlan<UserView>;
```

Level order is execution order. `local` and `shared` describe cache visibility; Read itself does not know which technologies implement those levels. Distributed coordination requires shared-cache rendezvous and is interpreted by Reader.

`ReadCacheKey` keeps namespace, version, partition/security scope, and value explicit. Consumers must choose deterministic identities that cannot cross security or tenant boundaries incorrectly.

## Public API

The package exports `Query`, `QueryContext`, `QueryOptions`, result helpers, cache reader/writer contracts, cache outcomes, cache scopes/levels/plans, `ReadCacheKey`, and `QueryReadCoordinationOptions`.

## Architectural boundary

Query contains no business logic. It never reads or writes caches, resolves handlers, coordinates flights, or executes a Read. Cache readers and cache writers remain separate capabilities; Reader owns traversal and population.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)

# Read public API boundary

This document freezes the supported package and API boundary for the implemented `Read -> Query -> Reader` pipeline.

The canonical architecture is defined in [`architecture/README.md`](architecture/README.md). This document is narrower: it identifies the packages and root exports that external repositories may depend on without relying on workspace source resolution or internal implementation files.

## Supported package set

The Read release consists of nine packages.

### Business and execution contracts

- `@event-driven-platform/read`
- `@event-driven-platform/query`
- `@event-driven-platform/read-handler`
- `@event-driven-platform/read-handler-resolver`
- `@event-driven-platform/read-execution-coordinator`

These packages define the business read intent, declarative execution configuration, source-handler boundary, handler-resolution boundary, and technology-neutral distributed coordination contract.

### Execution engine

- `@event-driven-platform/reader`

Reader is the centralized read execution engine. Consumers must not move cache traversal, cache population, local in-flight coalescing, distributed rendezvous, timeout, or cancellation orchestration into Read or ReadHandler implementations.

### Infrastructure adapters

- `@event-driven-platform/read-cache-in-memory`
- `@event-driven-platform/read-cache-redis`
- `@event-driven-platform/read-execution-coordinator-redis`

These packages provide optional implementations of the technology-neutral cache and coordination contracts. Redis is not part of the `Read`, `Query`, or `Reader` contracts.

## Installation

Consumers should declare the packages they import directly. A typical cached multi-instance composition may use:

```bash
pnpm add \
  @event-driven-platform/read \
  @event-driven-platform/query \
  @event-driven-platform/read-handler \
  @event-driven-platform/read-handler-resolver \
  @event-driven-platform/reader \
  @event-driven-platform/read-cache-in-memory \
  @event-driven-platform/read-cache-redis \
  @event-driven-platform/read-execution-coordinator \
  @event-driven-platform/read-execution-coordinator-redis
```

Packages are independently versioned through Nx Release. Consumers rely on published package manifests rather than monorepo path aliases or deep imports.

## Package responsibilities

### `@event-driven-platform/read`

Defines the reusable business-oriented `Read` contract and its result typing. A Read contains its name, actor, tenant, read parameters, and a type-only association with the expected result. `Read.tenant` is the single source of tenant identity for Reader execution. Read does not contain cache, timeout, storage, Redis, or other execution infrastructure.

### `@event-driven-platform/query`

Defines `Query`, caller execution options, deterministic logical `ReadCacheKey`, ordered cache plans, cache reader/writer capabilities, cache scopes, optional distributed coordination options, and the tenant-scoped key contract used by Reader infrastructure.

A Query cache plan carries only the logical read/cache key. Tenant is not repeated in `QueryContext` or cache-plan configuration. Reader combines `Read.tenant` with the logical key before cache, local in-flight, or distributed coordination work.

Query is declarative configuration. It does not execute cache readers, write caches, resolve handlers, or coordinate work.

### `@event-driven-platform/read-handler`

Defines the typed `ReadHandler` source boundary. A handler reads from one source responsibility and returns the result associated with its Read. Handlers do not write caches or invoke Reader.

Handlers receive the complete Read, including `read.tenant`. For tenant-scoped data, the source handler/storage adapter must use that tenant when selecting data, including reads that otherwise look uniquely addressable by an ID. Reader provides the tenant context but does not implement persistence-specific tenant filtering or authorization.

### `@event-driven-platform/read-handler-resolver`

Defines explicit handler-resolution outcomes. Resolver implementations perform lookup/composition only; Reader owns execution. Tenant is carried by the Read but does not form a separate handler-resolution rule or select tenant-specific handler implementations.

### `@event-driven-platform/read-execution-coordinator`

Defines transient cross-instance ownership, renewal, release, and bounded follower waiting. Coordination identity is tenant-scoped by construction. The coordinator transports no read result and persists no durable execution history.

### `@event-driven-platform/reader`

Exports the `Reader` contract and `DefaultReader` composition entry point together with the supported dependency/runtime contracts and typed Reader errors.

Reader derives one effective tenant-scoped identity from `Read.tenant` plus the Query's logical cache key and uses it consistently for cache access, local in-flight coalescing, and distributed coordination. Identical logical keys from different tenants therefore cannot share cache entries or coordinated execution.

Internal execution services used by `DefaultReader` are not public API. Consumers must import from the package root rather than `src/lib/*` paths.

### Cache and coordinator adapters

The InMemory cache implements local `CacheReader`/`CacheWriter` capabilities. The Redis cache implements shared cache capabilities with explicit codec, key encoding, TTL, and jitter policy. Both cache adapters receive tenant-scoped keys from Reader. The Redis coordinator implements the technology-neutral coordination contract with tenant-scoped ownership-safe leases and follower wake-up.

Adapter implementation details are not architectural contracts merely because they are used internally by the package.

## Consumer composition model

A consuming repository is expected to:

1. define reusable domain Read types with an explicit tenant;
2. implement source-specific ReadHandlers that use `read.tenant` when source access is tenant-scoped;
3. provide a ReadHandlerResolver whose resolution semantics are independent from tenant isolation;
4. construct `DefaultReader` with the resolver and, only when distributed coordination is used, a `ReadExecutionCoordinator`;
5. create Queries containing caller controls and optional cache plans with logical cache keys;
6. execute Queries only through Reader.

A cache plan declares cache topology explicitly. Local and shared scope are properties of cache levels, not of Read itself. Tenant identity is not configured on cache levels or Query context; Reader derives the tenant-scoped effective identity from the Read.

A distributed cache plan requires a shared cache level because the coordinator carries ownership only; successful results rendezvous through shared cache.

## Public failure surface

Reader exposes typed errors for failures that callers or composition boundaries may need to distinguish, including:

- missing or ambiguous handler resolution;
- timeout and caller cancellation;
- missing distributed coordination configuration;
- coordinator unavailability;
- distributed ownership loss.

Cache misses and cache IO degradation are not represented as business errors. Reader follows the documented cache failure policy and continues traversal where safe.

## Extension boundaries

The supported extension points are explicit contracts rather than deep implementation hooks:

- `ReadHandler` and `ReadHandlerResolver` for source integration;
- `CacheReader` and `CacheWriter` for cache technologies;
- `ReadExecutionCoordinator` for distributed ownership/waiting;
- `ReadTimeout` for caller timeout integration;
- codec, key encoder, TTL policy, clock, and random-source contracts exposed by the relevant cache adapter packages where customization is supported.

`DefaultReader` internal services such as source execution, cache traversal, local in-flight management, and distributed-flight orchestration remain implementation details.

## Compatibility boundary

The compatibility commitment is the package-root API plus the documented behavior of the Read pipeline. File layout under `src/lib`, private helpers, default internal implementations that are not exported, test utilities, and deep-import paths are not supported compatibility surfaces.

The public boundary must not be expanded merely because a new helper exists in the workspace. New exports require explicit review of ownership, consumer need, runtime semantics, and compatibility cost.

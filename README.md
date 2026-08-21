# Event Driven Platform

Reusable TypeScript building blocks for composing distributed, event-driven systems.

This repository provides explicit domain and execution contracts rather than a complete application framework. Consumers install and compose the packages they need, provide their own domain handlers and infrastructure adapters, and keep business concerns separate from execution infrastructure.

> **Status:** pre-1.0. The write and read execution pipelines are implemented and have reviewed public package boundaries. Packages and capabilities outside those reviewed boundaries remain unsupported until explicitly qualified.

## Architecture at a glance

The platform keeps write and read execution as independent pipelines:

```text
Write: Operation -> Command -> Runner
Read:  Read      -> Query   -> Reader
```

### Write side

- **Operation** describes one atomic business action and remains unaware of retries, rate limiting, persistence, messaging, and other execution infrastructure.
- **Command** transports an Operation together with execution context and optional execution policy.
- **Runner** is the centralized execution engine that coordinates handler resolution, execution logging and idempotency, transactions, execution policies, result persistence, event-envelope creation, and Outbox persistence.

### Read side

- **Read** describes business-oriented intent to obtain data and remains unaware of cache, storage, coordination, and other execution infrastructure.
- **Query** transports a Read together with caller execution controls and an optional declarative cache/coordination plan.
- **Reader** is the centralized read execution engine that coordinates handler resolution, cache traversal and population, process-local in-flight coalescing, optional distributed shared-cache rendezvous, timeout, and cancellation.

ReadHandlers remain source-specific readers and never write caches. Cache readers and writers are separate capabilities. Distributed coordination is optional and infrastructure-neutral; Redis-backed cache and coordinator implementations are supplied as adapters.

See [Architecture](./docs/architecture/README.md) for the canonical description of responsibilities, lifecycle, invariants, and maturity.

## Public packages

Public packages are small, independently versioned building blocks. Install the packages your application imports directly rather than depending on a repository-wide facade.

### Domain and identity contracts

- [`@event-driven-platform/types`](./packages/types/README.md) — shared branded-type primitives.
- [`@event-driven-platform/actor`](./packages/actor/README.md) — actor identity contracts.
- [`@event-driven-platform/subject`](./packages/subject/README.md) — operation subject contracts.
- [`@event-driven-platform/aggregate-reference`](./packages/aggregate-reference/README.md) — typed aggregate references.
- [`@event-driven-platform/tenant-reference`](./packages/tenant-reference/README.md) — typed tenant references.
- [`@event-driven-platform/intent`](./packages/intent/README.md) — deterministic operation intent contracts.
- [`@event-driven-platform/operation`](./packages/operation/README.md) — atomic business-operation contracts.
- [`@event-driven-platform/operation-result`](./packages/operation-result/README.md) — typed operation outcomes and emitted events.

### Command and write execution policy

- [`@event-driven-platform/guard`](./packages/guard/README.md) — guard policy contracts.
- [`@event-driven-platform/rate-limit`](./packages/rate-limit/README.md) — rate-limit policy contracts.
- [`@event-driven-platform/retry`](./packages/retry/README.md) — retry policy contracts.
- [`@event-driven-platform/command`](./packages/command/README.md) — execution envelope around an Operation.

### Write execution state and persistence contracts

- [`@event-driven-platform/clock`](./packages/clock/README.md) — clock abstraction and standard clock implementations.
- [`@event-driven-platform/execution`](./packages/execution/README.md) — execution identity and attempt contracts.
- [`@event-driven-platform/execution-log`](./packages/execution-log/README.md) — durable execution-log state and transitions.
- [`@event-driven-platform/execution-log-store`](./packages/execution-log-store/README.md) — execution-log persistence port.
- [`@event-driven-platform/execution-transaction`](./packages/execution-transaction/README.md) — transaction boundary used by execution.

### Write handlers, events, and Outbox

- [`@event-driven-platform/operation-handler`](./packages/operation-handler/README.md) — typed Operation handler contract.
- [`@event-driven-platform/operation-handler-resolver`](./packages/operation-handler-resolver/README.md) — handler resolution port.
- [`@event-driven-platform/event`](./packages/event/README.md) — event and event-envelope contracts.
- [`@event-driven-platform/operation-event-envelope-factory`](./packages/operation-event-envelope-factory/README.md) — conversion of emitted Operation events into envelopes.
- [`@event-driven-platform/outbox`](./packages/outbox/README.md) — Outbox record contracts.
- [`@event-driven-platform/outbox-store`](./packages/outbox-store/README.md) — Outbox persistence port.

### Write execution engine

- [`@event-driven-platform/runner`](./packages/runner/README.md) — centralized `Operation -> Command -> Runner` execution engine.

### Read contracts and handlers

- [`@event-driven-platform/read`](./packages/read/README.md) — business-oriented read intent and result typing.
- [`@event-driven-platform/query`](./packages/query/README.md) — Query transport, caller controls, cache plan, and cache capability contracts.
- [`@event-driven-platform/read-handler`](./packages/read-handler/README.md) — typed source-read handler contract.
- [`@event-driven-platform/read-handler-resolver`](./packages/read-handler-resolver/README.md) — explicit read-handler resolution boundary.
- [`@event-driven-platform/read-execution-coordinator`](./packages/read-execution-coordinator/README.md) — technology-neutral distributed read-execution coordination contract.

### Read execution engine and adapters

- [`@event-driven-platform/reader`](./packages/reader/README.md) — centralized `Read -> Query -> Reader` execution engine.
- [`@event-driven-platform/read-cache-in-memory`](./packages/read-cache-in-memory/README.md) — bounded process-local cache adapter.
- [`@event-driven-platform/read-cache-redis`](./packages/read-cache-redis/README.md) — shared Redis cache reader/writer adapter.
- [`@event-driven-platform/read-execution-coordinator-redis`](./packages/read-execution-coordinator-redis/README.md) — Redis implementation of distributed read-execution coordination.

Packages that are incomplete or not approved as consumer-facing remain private and are not part of the supported public surface merely because they exist in the workspace.

For reviewed package/export boundaries and consumer composition models, see [Execution public API boundary](./docs/execution-public-api.md) and [Read public API boundary](./docs/read-public-api.md).

## Getting started

Packages are consumed through normal npm dependencies. Install only what your application imports directly.

A Runner-based application commonly starts with:

```bash
pnpm add \
  @event-driven-platform/command \
  @event-driven-platform/runner \
  @event-driven-platform/execution-log-store \
  @event-driven-platform/execution-transaction \
  @event-driven-platform/operation-handler-resolver \
  @event-driven-platform/outbox-store
```

A Reader-based application commonly starts with:

```bash
pnpm add \
  @event-driven-platform/read \
  @event-driven-platform/query \
  @event-driven-platform/read-handler \
  @event-driven-platform/read-handler-resolver \
  @event-driven-platform/reader
```

Add cache and coordination adapter packages only when the application's read topology requires them.

Consuming applications define their domain Operations/Reads and handlers, provide implementations or adapters for the required ports, construct Runner and/or Reader, and execute only through those centralized engines.

Start with the README of each package you use. For complete supported composition models, see the write and read public API boundary documents.

## Documentation

- [Architecture](./docs/architecture/README.md) — canonical high-level architecture, invariants, and maturity status.
- [Execution public API boundary](./docs/execution-public-api.md) — reviewed public packages, exports, and consumer composition model for the write pipeline.
- [Execution release readiness](./docs/execution-release-readiness.md) — write execution lifecycle semantics and release-readiness evidence.
- [Read public API boundary](./docs/read-public-api.md) — reviewed public packages, exports, extension points, and consumer composition model for the read pipeline.
- [Read release readiness](./docs/read-release-readiness.md) — read execution semantics, qualification evidence, and remaining external-consumer checks.
- [Release process](./docs/release/README.md) — repository-specific versioning and npm publication procedure validated end to end.
- [`packages/*/README.md`](./packages) — package-specific purpose, API, usage, and integration guidance.

## Development

The workspace uses pnpm and Nx. Install the repository dependencies from the lockfile:

```bash
pnpm install --frozen-lockfile
```

Use Nx for dependency-aware validation of changes:

```bash
pnpm nx affected -t lint test typecheck build
```

Repository-specific agent/contributor rules are defined in [`AGENTS.md`](./AGENTS.md). Detailed Nx behavior should be derived from the current workspace configuration and Nx tooling rather than duplicated here.

## Releases

Public packages are independently versioned with Nx Release using Conventional Commits and the project dependency graph. A change to one package may therefore also release dependent packages when their dependency metadata must advance.

Release preparation and npm publication are separate steps, and production publication uses the repository's GitHub Actions workflow with npm Trusted Publishing/OIDC.

See [Release process](./docs/release/README.md) for the validated repository-specific procedure.

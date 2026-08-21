# Architecture

This directory is the canonical high-level architecture entry point for this repository.

It documents architecture that is evidenced by the current repository state. It is not a roadmap and must not be used to describe packages, concepts, or execution layers that do not yet exist.

## Documentation status

Architecture in this document uses two maturity states:

- **Stable / implemented** — the architecture exists in the repository, is sufficiently complete to describe as current behavior, and may have a reviewed public boundary.
- **Draft / incomplete** — concrete contracts or implementation exist in the repository, but the architecture is not complete or stable enough to describe as a finished execution pipeline.

A planned or hypothetical concept is not `Draft`. If it has no established repository implementation or approved current contract, it does not belong in this document.

## Stable: write execution pipeline

The implemented write-side execution architecture is:

```text
Operation -> Command -> Runner
                         |
                         +-> OperationHandlerResolver -> OperationHandler
                         +-> ExecutionLogStore
                         +-> ExecutionTransaction
                         +-> GuardEvaluator          (optional)
                         +-> RateLimiter             (optional)
                         +-> ExecutionTimeout        (optional)
                         +-> RetryDelay              (optional)
                         +-> OutboxStore
```

The three primary concepts have intentionally separate responsibilities.

### Operation

An `Operation` represents one atomic business action. It carries the business-oriented data required to describe that action, including its identity/context such as intent, actor, tenant, subject, aggregate, payload, and associated result type.

An Operation does not own execution infrastructure. In particular, it does not contain retry, timeout, rate-limit, persistence, messaging, or Outbox behavior.

Operations do not execute other Operations and do not publish messages.

### Command

A `Command` transports an Operation through the execution pipeline.

It contains the Operation together with command context and optional execution policy/options. Command is an execution envelope; it contains no business logic.

Keeping Command separate from Operation allows the same business action model to remain independent from execution concerns.

### Runner

`Runner` is the centralized execution engine. It accepts Commands and is the only supported boundary for executing Operations through this pipeline.

Runner owns orchestration of execution concerns around the Operation handler, including the concerns represented by its configured dependencies and optional runtime ports:

- handler resolution;
- execution identity and execution-log transitions;
- idempotent execution behavior backed by the execution log;
- transaction boundaries;
- guard evaluation;
- rate limiting;
- timeout handling;
- retry orchestration;
- result/failure persistence through execution-log transitions;
- conversion of emitted Operation events into event envelopes;
- Outbox persistence.

Consumers must not bypass Runner to independently recreate these execution semantics.

### OperationHandler and resolution

`OperationHandler<TOperation>` executes one resolved Operation and returns that Operation's typed result.

`OperationHandlerResolver` maps an Operation to its handler. The resolver boundary allows applications to provide handler lookup/composition without moving execution infrastructure into Operations or handlers.

Operation handlers execute their Operation inside the execution boundary provided by Runner. They are not an orchestration layer for other Operations.

### Execution Log and idempotency

The execution log is the durable record of Operation execution state. Runner uses the `ExecutionLogStore` contract to claim execution and record execution transitions.

This execution state is also the basis for idempotent behavior: repeated execution of the same established intent is resolved through the execution-log lifecycle rather than by re-running domain behavior blindly.

Execution identity, attempts, leases, failures, and transition contracts are modeled by the execution-related packages and are coordinated by Runner rather than by Operation.

### Events and Outbox

An Operation result may contain emitted events, but Operations and handlers do not publish those events to messaging infrastructure.

Runner is responsible for the infrastructure boundary after execution: it uses the Operation event-envelope factory and Outbox contracts to persist event records for later publication by infrastructure outside the Operation itself.

This preserves the boundary between business execution and message transport.

## Write-side architectural invariants

The following are current architecture constraints:

- `Operation` and `Command` are separate concepts and must not be merged.
- Operations are business-oriented and infrastructure-unaware.
- Commands carry execution context/options and contain no business logic.
- Runner is the centralized execution engine.
- Operations do not execute other Operations.
- OperationHandlers do not act as an orchestration layer for other Operations.
- Operations do not publish events or know about messaging infrastructure.
- execution logging and idempotency belong to Runner's execution boundary.
- guards, rate limits, timeout, and retries are execution concerns owned by Runner.
- event-envelope creation and Outbox persistence happen outside Operation business logic.
- consumers do not bypass Runner to recreate execution semantics independently.

## Stable: read execution pipeline

The implemented read-side execution architecture is:

```text
Read -> Query -> Reader
                 |
                 +-> cache traversal / population       (optional)
                 +-> process-local in-flight coalescing  (cached queries)
                 +-> ReadExecutionCoordinator            (optional, distributed)
                 +-> ReadHandlerResolver -> ReadHandler
```

The read pipeline is intentionally independent from the write execution pipeline. It has its own business intent, transport, centralized execution boundary, handler-resolution boundary, cache capabilities, and optional transient coordination.

### Read

A `Read<TName, TParameters, TResult>` represents a typed business intent to obtain data. It carries the read name, actor, read parameters, and a type-only association with the expected result.

Read remains independent from execution infrastructure. It does not contain cache topology, storage technology, handler resolution, in-flight coordination, Redis clients, or Reader behavior.

### Query

A `Query<TRead>` transports an existing Read through the read execution pipeline together with query context and optional execution configuration.

Query may declaratively describe timeout, cancellation, an ordered cache plan, and distributed coordination options. It does not execute the Read, traverse caches, write caches, resolve handlers, or perform coordination itself.

Keeping Query separate from Read allows the same business read intent to remain independent from the execution policy used for a particular invocation.

### Reader

`Reader` is the centralized read execution engine. It accepts Queries and owns orchestration of the implemented read execution concerns.

Depending on the Query configuration, Reader coordinates:

- ordered cache traversal;
- cache promotion and source-result backfill;
- process-local in-flight coalescing for cached reads;
- optional distributed execution coordination after shared-cache miss;
- handler resolution and source execution;
- caller timeout and cancellation behavior.

A Query without a cache plan executes through the handler-resolution/source path without cache orchestration.

Consumers must not move these orchestration responsibilities into Read, Query, ReadHandler, cache adapters, or coordinator adapters.

### ReadHandler and resolution

`ReadHandler<TRead>` executes one source-specific read responsibility and returns the result type associated with the Read.

A handler reads from one source only. It does not traverse or populate caches, coordinate in-flight execution, resolve other handlers, or invoke Reader.

`ReadHandlerResolver` maps a Read to an explicit deterministic resolution outcome. Reader owns interpretation of that outcome and source execution. Under the current handler contract, a resolved handler returns a result directly rather than a source-level miss, so Reader executes the first handler in the resolver's ordered resolved set rather than treating handlers as fallback cache levels.

### Cache traversal and population

Cache topology is declared by Query and executed by Reader. Each cache level exposes a read capability and may expose a separate write capability.

Reader traverses cache levels in declared order:

```text
L1 -> L2 -> ... -> Ln -> source
```

The first cache hit is returned. When a lower cache level hits, Reader promotes that result only into preceding writable levels. When source execution succeeds, Reader backfills writable cache levels in reverse order:

```text
source result -> Ln -> ... -> L2 -> L1
```

Cache readers never write caches. Cache writers are separate capabilities and are invoked by Reader.

Cache IO is fail-open for result correctness: unavailable cache reads do not prevent traversal/source execution, and cache population failures do not replace an otherwise successful result. Source-handler failures remain authoritative.

### Process-local in-flight coalescing

For cached Queries, Reader uses the deterministic `ReadCacheKey` as process-local single-flight identity after the leading local cache path has missed.

Only one local leader for the same effective key continues through downstream shared-cache/source work while followers await that in-flight work. Different keys remain independent. A caller timeout or cancellation stops only that caller's wait and does not cancel shared in-flight work used by other callers.

This is transient execution coordination, not durable execution history or write-side idempotency.

### Distributed shared-cache rendezvous

A cache plan may enable distributed coordination after shared-cache miss through the technology-neutral `ReadExecutionCoordinator` boundary.

The coordinator provides transient ownership, renewal, bounded follower waiting, release, and ownership-generation fencing. It does not execute Reads and does not transport or persist read results.

Cluster-wide result coalescing therefore requires a shared cache level. The distributed owner publishes a successful source result through Reader's normal shared-cache backfill path. Followers wait for ownership to end and then re-read shared cache; on another miss they re-contend for ownership rather than bypassing coordination and executing the source directly.

Reader re-checks shared cache after acquiring ownership before executing the source. Healthy ownership is renewed while coordinated source/backfill work remains active. Ownership loss prevents the stale owner from intentionally publishing a new shared result.

Coordinator unavailability is fail-closed for a distributed cache plan so Reader does not bypass coordination and create an uncontrolled source herd.

Concrete Redis coordination and cache implementations are infrastructure adapters behind these contracts; Redis is not part of Read or Query semantics.

### Timeout and cancellation

Query timeout bounds the caller's complete Reader wait, including cache traversal, local-flight waiting, distributed waiting, and source work from that caller's perspective.

Cancellation allows one caller to stop waiting without cancelling shared local or distributed work that may still serve other callers. Shared work continues until its underlying execution settles and performs its normal cleanup/ownership-safe release path.

## Read-side architectural invariants

The following are current architecture constraints:

- `Read` and `Query` are separate concepts and must not be merged.
- Reads are business-oriented and infrastructure-unaware.
- Queries carry read execution configuration and contain no business logic.
- Reader is the centralized read execution engine.
- ReadHandlers read from one source and do not orchestrate the read pipeline.
- ReadHandlers do not write caches.
- cache readers and cache writers are separate capabilities.
- Reader owns cache traversal, promotion, and source-result backfill.
- cache failures do not replace successful read results or source execution under the current fail-open cache policy.
- process-local in-flight coalescing is transient and keyed by deterministic read/cache identity.
- distributed coordination is optional, transient, and separate from result storage.
- distributed coalescing requires shared cache rendezvous; the coordinator itself does not transport results.
- distributed coordinator unavailability is fail-closed for a distributed cache plan.
- caller timeout or cancellation does not cancel shared in-flight work for other callers.
- consumers do not bypass Reader to recreate read execution semantics independently.

## Architecture vs public API and release state

This document explains architectural concepts, responsibilities, and boundaries. It is not a package catalog or export reference.

For the reviewed write-side public package/export boundary, see:

- [`../execution-public-api.md`](../execution-public-api.md)

For write execution lifecycle guarantees and release-readiness evidence, see:

- [`../execution-release-readiness.md`](../execution-release-readiness.md)

Read-side public API and release-readiness documentation is maintained separately from this high-level architecture description.

Package-specific usage belongs in the corresponding package README rather than in this architecture overview.

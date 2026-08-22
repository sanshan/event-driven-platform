# Architecture

This directory is the canonical high-level architecture entry point for this repository.

It documents architecture that is evidenced by the current repository state. It is not a roadmap and must not be used to describe packages, concepts, or execution layers that do not yet exist.

## Documentation status

Architecture in this document uses two maturity states:

- **Stable / implemented** — the architecture exists in the repository, is sufficiently complete to describe as current behavior, and may have a reviewed public boundary.
- **Draft / incomplete** — concrete contracts or implementation exist in the repository, but the architecture is not complete or stable enough to describe as a finished execution pipeline.

A planned or hypothetical concept is not `Draft`. If it has no established repository implementation or approved current contract, it does not belong in this document.

## Stable: application orchestration and durable UseCase execution

The implemented application-orchestration layer sits above the two independent execution pipelines:

```text
REST / gRPC / Consumer / Webhook / Cron
                  |
                  v
          UseCaseExecutor
                  |
                  v
               UseCase
              /       \
          Runner       Reader
             |           |
          Command       Query
             |           |
         Operation       Read
```

Service/application entrypoints covered by this architecture invoke business flows through `UseCaseExecutor -> UseCase`. Direct `useCase.execute(...)` remains useful for isolated tests and internal composition, but it is not the supported service entrypoint path because it bypasses durable invocation claim and completed-result replay.

### UseCase

A `UseCase<TInput, TResult>` is a typed application/business orchestrator. It receives `UseCaseContext`, which contains the authoritative parent `Intent` and the distributed-flow `correlationId`.

Concrete UseCases may:

- call Operations through Runner using Commands;
- call Reads through Reader using Queries;
- use previous results to decide later work;
- coordinate multiple application features;
- execute independent work sequentially or in parallel when business semantics allow it;
- return a typed final result.

The generic UseCase contract does not own durable invocation state, retries, rate limiting, guards, transaction orchestration, Outbox/event publication, Operation execution semantics, Read execution semantics, or transport behavior. It does not depend on Runner or Reader; concrete application composition supplies those boundaries.

Operations still execute only through Runner and Reads still execute only through Reader. UseCase does not merge or replace either pipeline.

### UseCaseExecutor

`UseCaseExecutor` is a narrow durable invocation boundary. Its responsibilities are limited to:

- deriving execution identity from the supplied UseCase Intent;
- atomically claiming one logical invocation through `UseCaseExecutionStore`;
- requesting a fixed 30 second lease for a new claim;
- rejecting an active duplicate;
- reclaiming a released or reclaimable incomplete invocation through the store contract;
- executing the UseCase after a successful claim;
- passing the supplied CorrelationId unchanged into UseCaseContext;
- durably persisting the final successful UseCase result through fenced completion;
- returning the exact stored result without entering the UseCase when the invocation is already completed;
- preventing a stale executor from completing/releasing after another owner has advanced the lease generation.

The Executor does not renew leases and does not attempt to infer whether a still-running UseCase is healthy, progressing, or stuck. The fixed lease is a recovery/exclusivity window, not an execution timeout. A UseCase may continue running after its lease becomes reclaimable.

UseCaseExecutor does not execute Commands, Operations, Queries, or Reads. It does not implement Runner-style retries, timeout, guards, rate limiting, attempts, transactions, Outbox/event handling, child-step checkpoints, broker behavior, heartbeat, progress detection, cancellation, or CorrelationId generation. Its generic production dependency graph remains independent from Runner, Reader, EventEnvelope, and broker implementations.

### Durable completion and retry semantics

The durable UseCase execution record is authoritative only for whole-invocation completion.

After durable completion:

```text
same parent Intent
-> store reports completed
-> exact previous final result is returned
-> UseCase is not executed again
-> Reads and child Operations are not rerun
```

Before durable completion, a reclaimable retry behaves differently:

```text
same parent Intent
-> prior claim released or becomes reclaimable after the fixed lease window
-> claim or reclaim
-> UseCase starts again from the beginning
```

UseCaseExecutor does not checkpoint individual orchestration steps and does not infer completion from child Operations. Reads, orchestration, and branch decisions may therefore run again and may observe changed state. This architecture does not promise exactly-once UseCase code execution or deterministic replay of Reads/branches.

A UseCase that continues after lease expiry is not automatically cancelled. Once the store allows reclaim, another Executor may start the same incomplete invocation. Concurrent orchestration is therefore possible before durable completion.

Write-side safety across such retries comes from deterministic child Operation Intents and the existing Runner idempotency/conflict boundary. An already encountered logical write is reconstructed with the same child Intent; unfinished child work may proceed on the retry.

A normal thrown UseCase error is rethrown after a best-effort fenced release. Retry cadence remains external to the Executor. Successful completion is accepted only through the lease returned by `claim`; if another owner has reclaimed and advanced the lease generation, the stale completion is rejected and the stale Executor must not return that result as durable success.

### UseCase execution store

`UseCaseExecutionStore` is a separate technology-neutral persistence port rather than reuse of the Operation-specific execution-log lifecycle. It reuses generic execution identity and lease primitives where semantics match, but its transition surface is only:

```text
claim
complete
release
```

The Executor currently supplies `leaseDurationMs = 30_000` to `claim`. The store is responsible for atomic claim/reclaim eligibility and for generating a newer fenced lease generation on reclaim. `complete` and `release` require the current lease reference and must reject stale owner/version pairs.

The store has no renewal transition and does not own liveness/progress detection.

The store does not own Runner attempts, failure history, Operation snapshots, Outbox state, retry bookkeeping, guards, rate limits, execution transactions, or child-step state.

No production database/Redis adapter is supplied by the UseCase execution layer. Applications must provide an adapter whose claim/reclaim/complete/release transitions are atomic and durable for their storage technology. In-memory test doubles are not cross-process durability or crash recovery.

### Synchronous causal Intent lineage

Intent is the logical identity used for UseCase and Operation execution. CorrelationId is not part of that identity.

For one logical child effect:

```text
parent UseCase Intent
+ semantic child slot
-> child Operation Intent
```

For repeated logical child effects:

```text
parent UseCase Intent
+ semantic child slot
+ stable business discriminator
-> child Operation Intent
```

The same logical child retains the same Intent across retries. Array position, collection iteration order, process-local counters, timestamps, random values, current Read order, Operation payload, and concrete Operation type are not logical child identity.

Mutable Read data may change the reconstructed Operation payload or may cause a mutually exclusive alternative Operation implementation to be selected. If both represent the same semantic effect, they use the same child slot and therefore the same child Intent. This preserves Runner's existing Operation-snapshot idempotency/conflict protection instead of hiding changed work behind a newly minted Intent. Separate slots are for genuinely distinct effects that may both legitimately occur.

### Event-driven continuation

An Event-triggered downstream UseCase is a new logical invocation, not a direct/nested UseCase call. The supported asynchronous continuation is:

```text
UseCase U1
 -> Runner
 -> Operation O1
 -> Event E1
 -> Outbox / Topic
 -> Consumer
 -> UseCaseExecutor
 -> UseCase U2
```

The existing EventEnvelope carries the producing Operation Intent ID, stable Event ID, and CorrelationId. Consumer composition derives the downstream UseCase Intent from:

```text
parentIntentId = EventEnvelope.intentId
reactionSlot   = stable business/application reaction slot
sourceEventId  = EventEnvelope.eventId
```

Conceptually:

```text
producing Operation Intent O1
+ reaction slot R1
+ source Event E1
-> downstream UseCase Intent U2
```

The downstream Intent exposes O1 as its immediate parent and retains the source Event as derivation data. Redelivery of the same Event to the same reaction slot derives the same U2. Different Events or different reaction slots derive different downstream Intents. Broker partition, offset, delivery-attempt identity, consumer instance, timestamps, randomness, and CorrelationId do not participate in that identity.

The consumer invokes downstream work through UseCaseExecutor and passes `EventEnvelope.correlationId` unchanged. Intent derivation itself remains transport-neutral and does not depend on EventEnvelope or broker types.

### CorrelationId

Intent lineage and CorrelationId are orthogonal:

```text
Intent / lineage -> logical action identity, causation, idempotency
CorrelationId    -> membership in one distributed end-to-end flow
```

The supported propagation chain is:

```text
root UseCase U1          correlationId = C1
  -> Command / Operation O1            C1 via CommandContext
  -> Query                              C1 via QueryContext
  -> Event E1                           C1 in EventEnvelope
  -> Consumer
  -> downstream UseCase U2              C1
  -> downstream Command / Query         C1
```

UseCaseExecutor consumes rather than generates the correlation value. Concrete UseCases propagate it unchanged into child CommandContext and QueryContext. Existing Operation event-envelope creation copies CommandContext correlation into the EventEnvelope. Event consumers continue the same value into downstream UseCaseExecutor requests.

CorrelationId is never an idempotency key and never participates in Intent derivation.

## UseCase-layer architectural invariants

The following are current architecture constraints:

- supported service/application entrypoints execute business flows through `UseCaseExecutor -> UseCase`;
- UseCase owns application/business orchestration rather than Operation/Read execution infrastructure;
- UseCaseExecutor owns only durable invocation claim, fixed-lease fencing, durable completion, and completed-result replay;
- UseCase claims use a fixed 30 second lease with no heartbeat or renewal;
- lease expiry does not cancel a running UseCase and does not prove that it is unhealthy;
- reclaim may cause concurrent orchestration before durable completion, while fenced completion protects the current durable owner;
- Runner remains the only supported Operation execution boundary;
- Reader remains the only supported Read execution boundary;
- UseCaseExecutor does not checkpoint child steps or infer whole-UseCase completion from child Operations;
- retries before durable completion restart UseCase orchestration from the beginning;
- completed retries replay the exact stored final result without entering the UseCase;
- child write identity derives from parent Intent plus semantic slot and, for 1:N effects, a stable business discriminator;
- replay-varying Read/payload data and concrete Operation choice do not mint a new Intent for the same logical effect;
- Event-triggered downstream UseCases are new invocations reached through `Event -> Consumer -> UseCaseExecutor`, not direct UseCase-to-UseCase calls;
- downstream Event-driven Intent identity derives from producing Operation Intent + reaction slot + source Event ID;
- CorrelationId continues unchanged through the distributed flow but never acts as idempotency identity;
- no concrete durable UseCase execution-store adapter is implied by the technology-neutral store contract.

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

For the reviewed UseCase execution public package/export boundary, see:

- [`../use-case-execution-public-api.md`](../use-case-execution-public-api.md)

For the reviewed write-side public package/export boundary, see:

- [`../execution-public-api.md`](../execution-public-api.md)

For write execution lifecycle guarantees and release-readiness evidence, see:

- [`../execution-release-readiness.md`](../execution-release-readiness.md)

Read-side public API and release-readiness documentation is maintained separately from this high-level architecture description.

Package-specific usage belongs in the corresponding package README rather than in this architecture overview.

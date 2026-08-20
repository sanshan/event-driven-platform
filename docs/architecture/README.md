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

## Draft: read-side contracts

The read side is currently **Draft / incomplete** and is not part of the stable public execution boundary.

Only the following concrete concepts are documented here because they exist in the repository today.

### Read

`Read<TName, TParameters, TResult>` represents a typed intent to obtain data. Its current contract contains:

- a read name;
- an actor;
- read parameters;
- a type-only association with the expected result type.

The Read contract does not currently define cache, storage, or execution-engine behavior.

### Query

`Query<TRead>` wraps an existing Read together with query context and optional query options.

The current Query contract preserves the Read's result type while separating the business-oriented Read from read-execution configuration.

### Current limitation

The repository does not yet contain a complete read execution pipeline comparable to `Operation -> Command -> Runner`.

Therefore this document intentionally does not describe a read execution engine, handler pipeline, cache traversal, cache population mechanism, or other absent read-side concepts as current architecture.

The existing Read and Query contracts may evolve while this area remains Draft / incomplete.

## Architecture vs public API and release state

This document explains architectural concepts, responsibilities, and boundaries. It is not a package catalog or export reference.

For the reviewed write-side public package/export boundary, see:

- [`../execution-public-api.md`](../execution-public-api.md)

For execution lifecycle guarantees and release-readiness evidence, see:

- [`../execution-release-readiness.md`](../execution-release-readiness.md)

Package-specific usage belongs in the corresponding package README rather than in this architecture overview.

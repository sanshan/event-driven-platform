# UseCase execution public API boundary

This document freezes the reviewed public package and API boundary for the UseCase execution layer introduced by Epic #107.

The layer sits above, and does not replace, the two existing execution pipelines:

```text
entrypoint -> UseCaseExecutor -> UseCase
                               /       \
                           Runner       Reader
                             |            |
                          Command        Query
                             |            |
                         Operation        Read
```

## Supported public packages

### `@event-driven-platform/use-case`

Intentional package-root exports:

- `UseCase<TInput, TResult>` — typed application/business orchestration contract;
- `UseCaseContext` — invocation context containing the authoritative parent `Intent` and propagated `correlationId`.

The generic UseCase contract does not depend on Runner or Reader. Concrete application UseCases receive those boundaries through normal application composition.

### `@event-driven-platform/use-case-execution-store`

Intentional package-root exports are the technology-neutral persistence port and the request/result contracts required to implement it:

- `UseCaseExecutionStore`;
- claim request/result and `claimed`, `completed`, `already-in-progress`, `intent-conflict` variants;
- renew-lease request/result;
- complete request/result;
- release request/result;
- shared transition-rejection variants.

The store surface is deliberately limited to:

```text
claim
renewLease
complete
release
```

It is not a second `ExecutionLogStore`: it has no attempts, failure history, retry bookkeeping, child-step state, Operation snapshots, Outbox state, guards, rate limits, or execution transactions.

No production adapter is supplied by this Epic. A consuming application must provide an adapter whose claim/renew/complete/release transitions are atomic and durable for its storage technology. In-memory test doubles do not provide cross-process durability or crash recovery.

### `@event-driven-platform/use-case-executor`

Intentional package-root exports:

- `UseCaseExecutor`;
- `DefaultUseCaseExecutor`;
- `UseCaseExecutionRequest`;
- `UseCaseExecutorDependencies`;
- `UseCaseExecutorRuntime`;
- `UseCaseAlreadyInProgressError`;
- `UseCaseIntentConflictError`;
- `UseCaseExecutionOwnershipLostError`;
- `UseCaseExecutionTransitionError`;
- `UseCaseExecutorConfigurationError`.

Heartbeat timer and renewal-lifecycle implementation types are internal. They are not part of the supported package-root API.

`UseCaseExecutor` owns only durable invocation claim, lease ownership safety, completion persistence, and completed-result replay. It does not execute Operations or Reads and has no production dependency on Runner, Reader, EventEnvelope, or broker implementations.

### `@event-driven-platform/intent`

The existing Intent package remains the single logical identity mechanism. Epic #107 extends its public API with deterministic causal derivation:

- `Intent.parent` exposes the immediate parent Intent identity when derived;
- `Intent.derivation` exposes the semantic slot and optional stable discriminator;
- `IntentFactory.derive(...)` derives descendants through the same canonical deterministic UUIDv5 path as other Intents;
- `IntentDerivation`, `IntentParentReference`, and `IntentDerivationRequest` are public contracts needed by consumer composition.

Intent derivation remains transport-neutral and does not depend on EventEnvelope or broker types.

### `@event-driven-platform/execution`

Generic execution identity/lease primitives reused by both Runner-side and UseCase execution remain centralized here. `ExecutionLeaseReference` is intentionally public so persistence boundaries can share `{ ownerId, version }` fencing semantics instead of defining parallel lease-reference types.

## Dependency direction

The supported dependency direction is:

```text
UseCaseExecutor
    -> UseCase
    -> UseCaseExecutionStore
    -> generic execution / Intent / Clock primitives

concrete application UseCase
    -> Runner
    -> Reader

consumer reaction composition
    -> EventEnvelope fields
    -> Intent derivation
    -> UseCaseExecutor
```

The generic UseCaseExecutor must not gain Runner/Reader/Event/broker dependencies for convenience. Runner remains the only supported Operation execution engine; Reader remains the only supported Read execution engine.

## Supported entrypoint flow

Controllers, consumers, webhook handlers, cron jobs, gRPC handlers, and equivalent application entrypoints execute business flows through:

```text
entrypoint -> UseCaseExecutor -> UseCase
```

Direct `useCase.execute(...)` remains useful for isolated tests and internal composition, but it is not the supported service entrypoint path because it bypasses durable invocation deduplication and completed-result replay.

Concrete UseCases may compose:

```text
UseCase -> Runner.execute(Command)
UseCase -> Reader.execute(Query)
```

They do not execute Operations/Reads directly and do not recreate Runner/Reader infrastructure semantics.

## Retry and completion semantics

### Duplicate after durable completion

```text
same parent Intent
-> store claim reports completed
-> exact previously persisted final result is returned
-> UseCase is not entered
-> Reads and child Operations are not rerun
```

### Retry before durable completion

```text
same parent Intent
-> prior claim released/abandoned/expired
-> claim/reclaim
-> UseCase starts again from the beginning
```

UseCaseExecutor has no step checkpoints. Reads, orchestration, and branch decisions may occur again and may observe changed state. This is not exactly-once UseCase code execution and is not deterministic workflow replay.

Write safety comes from stable child Operation Intents plus Runner's existing idempotency/conflict semantics. An unfinished child may proceed on the retry; an already encountered logical child must be reconstructed with the same Intent.

UseCase failures are rethrown after a best-effort fenced release. Retry cadence is external to the Executor. Active duplicates receive a typed already-in-progress error rather than follower waiting/single-flight behavior.

Healthy long-running claims are renewed before lease expiry. A stale or ownership-uncertain Executor cannot durably complete a successful result. Completion-store failure is not treated as successful completion.

## Synchronous child Intent derivation

### One logical child

```ts
const childIntent = intentFactory.derive({
    parent: { id: context.intent.id },
    slot: 'create-invoice',
});
```

Identity is `parent Intent + semantic slot`.

### Repeated logical children

```ts
const childIntent = intentFactory.derive({
    parent: { id: context.intent.id },
    slot: 'notify-recipient',
    discriminator: recipientId,
});
```

Identity is `parent Intent + semantic slot + stable business discriminator`.

Array position, iteration order, process-local counters, timestamps, random values, current Read order, Operation payload, and concrete Operation type are not child identity.

If retry-time Read data changes the payload for the same logical write, the same child Intent must still be used so Runner's persisted Operation-snapshot conflict/idempotency semantics remain authoritative. Mutually exclusive concrete Operation types that implement one semantic effect share one slot. Separate slots are for genuinely distinct effects that may both legitimately occur.

## Event-triggered continuation

The supported asynchronous boundary is:

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

This is not direct `UseCase U1 -> UseCase U2` orchestration.

For a consumer reaction:

```ts
const downstreamIntent = intentFactory.derive({
    parent: { id: envelope.intentId },
    slot: 'start-order-fulfillment',
    discriminator: envelope.eventId,
});

await useCaseExecutor.execute({
    useCase: startOrderFulfillment,
    input,
    intent: downstreamIntent,
    correlationId: envelope.correlationId,
});
```

`EventEnvelope.intentId` is the producing Operation Intent and becomes the immediate parent of the downstream UseCase Intent. `EventEnvelope.eventId` is the stable source-event discriminator. The reaction slot is stable application/business identity.

Therefore:

- redelivery of the same Event to the same reaction slot derives the same downstream UseCase Intent;
- a different reaction slot derives a different Intent;
- a different source Event ID derives a different Intent even for the same producer and reaction slot;
- broker partition, offset, delivery-attempt metadata, process identity, timestamps, and randomness do not participate in identity;
- changing CorrelationId alone does not change the derived Intent.

## CorrelationId

Intent and CorrelationId solve different problems:

```text
Intent / lineage -> logical action identity, causation, idempotency
CorrelationId    -> membership in one distributed end-to-end flow
```

The supported propagation chain is:

```text
root UseCase U1            correlationId = C1
  -> Command / Operation O1               C1 via CommandContext
  -> Query                                 C1 via QueryContext
  -> Event E1                              C1 in EventEnvelope
  -> Consumer
  -> downstream UseCase U2                 C1
  -> downstream Command / Query            C1
```

UseCaseExecutor passes the supplied correlationId unchanged into `UseCaseContext`. Concrete UseCases propagate it into `CommandContext` and `QueryContext`. Existing Operation event-envelope creation copies `CommandContext.correlationId` into the EventEnvelope. Consumers propagate `EventEnvelope.correlationId` into downstream UseCaseExecutor requests.

CorrelationId is never an idempotency key and never participates in Intent derivation.

## External composition and packaging

Consumers use package-root imports; no cross-package deep import is part of the supported API. The buildable packages are published/verified through the repository's normal Nx and local-registry/package verification mechanisms rather than a UseCase-specific release mechanism.

This boundary must not be expanded with internal lifecycle helpers, transport-specific types, concrete persistence technology, or new execution semantics without a separate architecture review.

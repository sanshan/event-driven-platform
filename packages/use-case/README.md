# @event-driven-platform/use-case

Typed application-orchestration contract for the event-driven platform.

A `UseCase` coordinates application/business work. Concrete UseCases may compose write-side Operations through `Runner` and read-side Reads through `Reader`, but this package does not depend on either execution engine and does not implement their behavior.

## Contract

```ts
interface UseCase<TInput, TResult> {
    execute(input: TInput, context: UseCaseContext): Promise<TResult>;
}

interface UseCaseContext {
    readonly intent: Intent;
    readonly correlationId: string;
}
```

`intent` is the authoritative identity of the logical UseCase invocation. It is also the parent Intent available to orchestration when deterministic child Operation Intent derivation is needed.

`correlationId` is distributed correlation context. Concrete UseCases propagate it unchanged to child `CommandContext` and `QueryContext` values. It is not an idempotency key and does not participate in Intent identity.

## Supported application flow

Service/application entrypoints invoke business flows through:

```text
entrypoint -> UseCaseExecutor -> UseCase
```

Direct `useCase.execute(...)` is valid for isolated unit tests and internal composition, but it is not the supported service entrypoint path because it bypasses durable UseCase invocation deduplication and completed-result replay.

Inside a concrete UseCase, Operations still execute through Runner and Reads still execute through Reader:

```text
UseCase -> Runner -> Command -> Operation
UseCase -> Reader -> Query   -> Read
```

The UseCase owns orchestration decisions; it does not absorb the execution responsibilities of either engine.

## Retry implication

When an incomplete durable invocation is retried, UseCaseExecutor starts the UseCase again from the beginning. The UseCase contract therefore does not imply deterministic replay of Reads or branch decisions. Retry-safe writes require deterministic child Operation Intents and Runner's existing idempotency/conflict behavior.

## Boundaries

This package does not provide durable invocation state, deduplication, leases, retries, timeouts, guards, rate limiting, Outbox behavior, transport adapters, CorrelationId generation, child Intent derivation, Operation execution, or Read execution.

Operations remain executable only through `Runner`. Reads remain executable only through `Reader`.

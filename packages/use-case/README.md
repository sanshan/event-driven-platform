# @event-driven-platform/use-case

Typed application-orchestration contract for the event-driven platform.

A `UseCase` coordinates application/business work. Concrete UseCases may compose write-side Operations through `Runner` and read-side Reads through `Reader`, but this package does not depend on either execution engine and does not implement their behavior.

## Contract

```ts
interface UseCase<TInput, TResult, TContext extends UseCaseContext = UseCaseContext> {
    readonly name: string;

    execute(input: TInput, context: TContext): Promise<TResult>;
}

interface UseCaseContext {
    readonly intent: Intent;
    readonly correlationId: string;
}
```

`name` is the caller-defined, deployment-stable identifier for the concrete UseCase type. It must come from an explicit bounded application vocabulary rather than a runtime class or constructor name. Observability uses it to distinguish UseCase lifecycles; it does not participate in invocation identity or idempotency.

Concrete UseCases may extend `UseCaseContext` with invocation-specific metadata. The base context remains the default for simple UseCases. EDP owns only the `intent` and `correlationId` semantics; additional fields are consumer-owned and opaque to the execution platform.

`intent` is the authoritative identity of the logical UseCase invocation. It is also the parent Intent available to orchestration when deterministic child Operation Intent derivation is needed.

`correlationId` is distributed correlation context. Concrete UseCases propagate it unchanged to child `CommandContext` and `QueryContext` values. It is not an idempotency key and does not participate in Intent identity.

Stable reusable dependencies belong on the concrete UseCase rather than in invocation context.

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

This package does not provide durable invocation state, deduplication, leases, retries, timeouts, guards, rate limiting, Outbox behavior, transport adapters, CorrelationId generation, child Intent derivation, Operation execution, Read execution, or ambient/request context.

Operations remain executable only through `Runner`. Reads remain executable only through `Reader`.

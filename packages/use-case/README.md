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

## Boundaries

This package does not provide durable invocation state, deduplication, leases, retries, timeouts, guards, rate limiting, Outbox behavior, transport adapters, CorrelationId generation, child Intent derivation, Operation execution, or Read execution.

Operations remain executable only through `Runner`. Reads remain executable only through `Reader`.

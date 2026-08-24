# @event-driven-platform/intent

Defines deterministic intent identity used to recognize the same requested business action across repeated execution attempts.

## Installation

```bash
pnpm add @event-driven-platform/intent
```

## Role

Intent identity is the basis for write-side idempotency. Runner uses the intent carried by an Operation to detect an already recorded execution; Operations themselves do not implement idempotency.

Derived Intents also expose immediate causal lineage. A child identity is derived only from stable causal inputs: parent Intent, semantic slot, and an optional stable discriminator for repeated logical children.

Intent creation is a canonical platform rule rather than a replaceable runtime dependency. `IntentFactory` is stateless and exposes only static deterministic construction methods.

## API

- `Intent`, `IntentDescriptor` — root intent contracts.
- `IntentParentReference` — immediate parent identity for a derived Intent.
- `IntentDerivation`, `IntentDerivationRequest` — stable causal derivation metadata and input.
- `IntentFactory` — canonical static root construction and causal derivation API.

## Root construction

Create a root Intent directly through the static factory:

```ts
const intent = IntentFactory.create({
    namespace: 'billing',
    action: 'create-invoice',
    version: 1,
    tenant,
    components: {
        invoiceId: invoice.id,
    },
});
```

## Causal derivation

A 1:1 logical child uses a parent and semantic slot:

```ts
const childIntent = IntentFactory.derive({
    parent: parentUseCaseIntent,
    slot: 'reserve-funds',
});
```

A 1:N logical child additionally uses an already-stable business discriminator:

```ts
const childIntent = IntentFactory.derive({
    parent: parentUseCaseIntent,
    slot: 'reserve-funds',
    discriminator: invoice.id,
});
```

Collection position, iteration order, timestamps, randomness, mutable Read results, Operation payload, and concrete Operation type are not child identity. Mutually exclusive branches that implement the same logical effect use the same semantic slot so replay reaches Runner conflict/idempotency protection instead of silently creating another logical child.

For Event-driven continuation, composition code can derive a downstream UseCase Intent using only stable envelope identity values:

```ts
const downstreamIntent = IntentFactory.derive({
    parent: { id: eventEnvelope.intentId },
    slot: 'start-order-fulfillment',
    discriminator: eventEnvelope.eventId,
});
```

The package remains transport-neutral: it does not depend on EventEnvelope, broker, consumer, Runner, Reader, or UseCaseExecutor types.

CorrelationId is orthogonal to Intent identity and is deliberately absent from the derivation API. It is propagated through execution context rather than used for idempotency.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) for execution and idempotency boundaries.

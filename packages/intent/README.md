# @event-driven-platform/intent

Defines deterministic intent identity used to recognize the same requested business action across repeated execution attempts.

## Installation

```bash
pnpm add @event-driven-platform/intent
```

## Role

Intent identity is the basis for write-side idempotency. Runner uses the intent carried by an Operation to detect an already recorded execution; Operations themselves do not implement idempotency.

## API

- `Intent`, `IntentDescriptor` — intent contracts.
- `IntentFactory` — construction contract.
- `DefaultIntentFactory` — default deterministic factory.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) for execution and idempotency boundaries.

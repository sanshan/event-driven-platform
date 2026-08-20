# @event-driven-platform/clock

Provides the clock abstraction used by execution components that need deterministic access to time.

## Installation

```bash
pnpm add @event-driven-platform/clock
```

## API

- `Clock` — time-source contract.
- `SystemClock` — default implementation backed by the system clock.

Use the abstraction at execution boundaries that need replaceable time, especially where deterministic tests or infrastructure-specific time sources are required.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

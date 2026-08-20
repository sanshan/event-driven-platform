# @event-driven-platform/clock

Provides the clock abstraction used by execution components that need deterministic access to time.

## Installation

```bash
pnpm add @event-driven-platform/clock
```

## API

- `Clock` — time-source contract.
- `SystemClock` — default implementation backed by the system clock.
- `FixedClock` — deterministic implementation that always returns a configured timestamp.

Use `SystemClock` in production code that needs wall-clock time. Use `FixedClock` where deterministic time is useful, such as tests or controlled execution scenarios.

```ts
import { FixedClock } from '@event-driven-platform/clock';

const clock = new FixedClock('2026-07-18T10:00:00.000Z');

clock.now(); // '2026-07-18T10:00:00.000Z'
```

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

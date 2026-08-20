# @event-driven-platform/rate-limit

Defines Command-level rate-limit policy options for write execution.

## Installation

```bash
pnpm add @event-driven-platform/rate-limit
```

## API

- `RateLimitOptions` — rate-limit configuration carried by a Command.
- `RateLimitScope` — supported scope contract used by rate-limit configuration.

Rate-limit enforcement belongs to Runner. Consumers that enable the policy provide a `RateLimiter` implementation through Runner dependencies.

## Architectural boundary

This package describes policy only. Operations do not know about rate limiting and must not implement it themselves.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

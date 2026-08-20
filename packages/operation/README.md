# @event-driven-platform/operation

Defines `Operation`, the atomic business-action contract at the start of the write execution pipeline.

## Installation

```bash
pnpm add @event-driven-platform/operation
```

## Role

An Operation describes business intent and carries its execution metadata. It does not own retries, rate limiting, transport, persistence, messaging, Outbox behavior, or orchestration of other Operations.

Operations are transported by `Command` and executed through `Runner`.

## API

- `Operation` — generic Operation contract.
- `AnyOperation` — type-erased Operation constraint for infrastructure boundaries.
- `OperationResultOf` — associates an Operation type with its result type.

Consumers normally define application-specific Operation types by extending the `Operation` contract and execute them through the write pipeline rather than invoking handlers directly.

## Architectural constraints

```text
Operation -> Command -> Runner
```

Operations do not execute other Operations and do not publish emitted events themselves.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

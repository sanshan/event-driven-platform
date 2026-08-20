# @event-driven-platform/execution-transaction

Defines the transaction boundary Runner uses to execute domain work and persistence work atomically.

## Installation

```bash
pnpm add @event-driven-platform/execution-transaction
```

## API

- `ExecutionTransaction` — consumer-provided transaction contract.
- `ExecutionTransactionWork` — work executed inside the transaction boundary.
- `ExecutionTransactionOutcome` — commit/rollback outcome union.
- `ExecutionTransactionOutcomes` and exported type guards — supported outcome construction and narrowing helpers.

Consumers adapt their database/unit-of-work mechanism to this port. Runner owns when the transaction is used and how its outcome affects execution.

## Related documentation

See [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

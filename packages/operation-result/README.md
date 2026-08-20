# @event-driven-platform/operation-result

Defines typed outcomes produced by Operation handlers and persisted by the execution pipeline.

## Installation

```bash
pnpm add @event-driven-platform/operation-result
```

## API

`OperationResult` represents either a successful result or a rejection. The package provides:

- `OperationResults` factories for constructing supported outcomes;
- `SuccessfulOperationResult`;
- committed and rolled-back rejection contracts;
- type guards such as `isSuccessfulOperationResult` and `isOperationRejection`.

Prefer the exported factories and type guards over recreating result shapes manually.

## Role

Operation handlers return these outcomes. Runner interprets and persists them as part of execution; an Operation itself does not persist its result.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

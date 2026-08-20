# @event-driven-platform/execution

Defines execution identity, attempt identity, lease metadata, and normalized execution failure contracts used by Runner and execution persistence.

## Installation

```bash
pnpm add @event-driven-platform/execution
```

## API

Important contracts include:

- `ExecutionId` and `DefaultExecutionIdFactory`;
- `ExecutionAttemptId` and `DefaultExecutionAttemptIdFactory`;
- `ExecutionLease`, `ExecutionLeaseOwnerId`, and `ExecutionLeaseVersion`;
- `ExecutionFailure`.

These are infrastructure-facing execution primitives. They identify and coordinate executions; they are not domain Operations or business results.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

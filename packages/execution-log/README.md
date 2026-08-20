# @event-driven-platform/execution-log

Defines the durable execution-log state model used for idempotency, execution history, and traceability.

## Installation

```bash
pnpm add @event-driven-platform/execution-log
```

## API

The package exports typed execution-log entries and attempts for in-progress, completed, failed, and timed-out states, together with type guards for narrowing those states safely.

`ExecutionLogEntry` and `ExecutionAttempt` are the central unions; use the exported type guards instead of inspecting state shapes ad hoc.

## Role

Runner owns execution-log transitions. The log records execution state; Operations and handlers do not write it directly.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

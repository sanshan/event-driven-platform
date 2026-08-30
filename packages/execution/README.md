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
- `ExecutionFailure`, `ExecutionFailureError`, and `normalizeExecutionFailure`.

These are infrastructure-facing execution primitives. They identify and coordinate executions; they are not domain Operations or business results.

## Failure contract

`ExecutionFailure` is the canonical, transport-neutral shape of a classified failure: `{ code, message, retryable }`. `code` is stable and machine-readable — callers never need to parse `message`.

`ExecutionFailureError` is a concrete `Error` subclass that carries an `ExecutionFailure` as `executionFailure` and forwards the standard `Error.cause`. Runner, Reader, and UseCaseExecutor throw it (or a subclass of it) for every failure they can classify, so a consumer can catch failures from all three execution boundaries with a single `instanceof ExecutionFailureError` check — for example in a Nest exception filter that maps `executionFailure.code` to an HTTP response. EDP itself does not perform that mapping; it only makes the failure catchable.

`normalizeExecutionFailure(error)` returns the `ExecutionFailure` carried by an `ExecutionFailureError`, or a default `{ code: 'unexpected-execution-error', retryable: false }` for anything else. EDP does not infer retryability from arbitrary/unrecognized errors (for example a raw database driver error) — it has no way to know whether a given infrastructure error is transient. A handler or adapter that knows a specific error is transient opts it into retry explicitly:

```ts
throw new ExecutionFailureError(
    { code: 'persistence-transient-error', message: 'Transient persistence failure.', retryable: true },
    { cause: originalError },
);
```

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

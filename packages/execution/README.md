# @event-driven-platform/execution

Defines execution identity, attempt identity, lease metadata, and the canonical failure contracts shared by EDP execution boundaries and persistence.

## Installation

```bash
pnpm add @event-driven-platform/execution
```

## API

Important contracts include:

- `ExecutionId` and `DefaultExecutionIdFactory`;
- `ExecutionAttemptId` and `DefaultExecutionAttemptIdFactory`;
- `ExecutionLease`, `ExecutionLeaseOwnerId`, and `ExecutionLeaseVersion`;
- `ExecutionFailure`, `ExecutionFailureClassification`, and `ExecutionFailureRetry`;
- `ExecutionError`, `ExecutionFailureCarrier`, and `normalizeExecutionError`;
- `isExecutionFailure` and `isExecutionFailureCarrier`.

These are infrastructure-facing execution primitives. They identify and coordinate executions; they are not domain Operations or business results.

## Failure contract

`ExecutionFailure` is the single serializable failure descriptor used across EDP execution boundaries:

```ts
const failure: ExecutionFailure = {
    code: 'coordinator-unavailable',
    message: 'The execution coordinator is unavailable.',
    classification: 'unavailable',
    retry: 'caller',
    retryable: false,
};
```

- `code` is a stable machine-readable identifier. Consumers must not parse `message`.
- `classification` is bounded and transport-neutral: `cancelled`, `conflict`, `internal`, `invalid-configuration`, `policy-rejected`, `timeout`, or `unavailable`.
- `retry` describes where a retry decision may be made. It does not configure attempts, delay, or cadence:
    - `never` means the failure exposes no supported automatic retry;
    - `current-execution` means the current execution boundary may apply its existing configured retry policy;
    - `caller` means the current boundary must not retry, but a higher-level caller may decide to start another invocation.

`ExecutionError` is the canonical runtime Error carrier. Its `executionFailure` property is the durable descriptor. A wrapped lower-level Error is preserved through standard `Error.cause`; cause and stack are never part of `ExecutionFailure` and therefore are not persisted merely by serializing the descriptor.

`normalizeExecutionError` propagates an existing `ExecutionError` unchanged, preserves transitional typed Error carriers as causes, and deterministically maps other thrown values to `unexpected-execution-error` with `internal` / `never` semantics. It never classifies by parsing an Error message.

### Compatibility

The existing `ExecutionFailure` and `executionFailure` names are preserved; no competing failure model or package is introduced. The former `retryable` field remains as a deprecated compatibility field while consumers migrate to `retry`:

- it is `true` only when `retry` is `current-execution`;
- it is `false` for both `never` and `caller`, because a current execution boundary must not interpret caller-owned retry as permission to create another attempt.

### Business rejection is not an execution failure

An expected business rejection represented by `OperationResult.status = 'rejected'` remains a typed result. It is not converted into `ExecutionError` and does not enter this failure hierarchy.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).

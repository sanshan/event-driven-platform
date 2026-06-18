# Idempotency

Idempotency guarantees that repeated execution of the same Intent does not produce additional side effects.

## Ownership

Idempotency is owned by Runner.

Operations are unaware of idempotency.

## Execution flow

Command
→ Runner
→ Execution Log lookup

If execution already exists:

- return previous Result

Otherwise:

- execute Operation
- persist Result
- persist Execution Log

## Source of truth

Execution Log is the source of idempotency.

Idempotency decisions must be based on persisted execution history.

## Scope

Idempotency applies to:

- REST
- gRPC
- Consumers
- Webhooks
- Schedulers

## Side effects

Idempotency protects against repeated side effects.

Examples:

- duplicate deposits
- duplicate withdrawals
- duplicate emails
- duplicate bonus grants

## Design rules

Idempotency should:

- survive retries
- survive restarts
- survive process crashes
- tolerate duplicate delivery
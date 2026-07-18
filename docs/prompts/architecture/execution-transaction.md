# Execution Transaction

Execution Transaction is the infrastructure abstraction responsible for executing work inside a transactional boundary.

Execution Transaction belongs to the infrastructure layer.

It defines how transactional work is committed or rolled back.

Execution Transaction does not define any persistence technology.

## Purpose

Execution Transaction answers:

```txt
How is transactional work executed and completed?
```

Execution Transaction does not answer:

```txt
Which database is used?
How is the transaction implemented?
Which repositories participate?
How should an Operation be executed?
```

## Responsibilities

Execution Transaction is responsible for:

- creating a transactional execution boundary
- providing a transaction-associated context
- committing transactional work
- rolling back transactional work
- rolling back unexpected failures
- returning the callback result

Execution Transaction manages transaction lifecycle only.

## Transaction work

Transactional work is executed through a callback.

```txt
ExecutionTransaction
    ↓
transaction callback
    ↓
ExecutionTransactionOutcome
```

The callback receives a transaction-associated context.

The concrete context is defined by the infrastructure implementation.

Execution Transaction does not define which resources the context contains.

## Execution outcome

The callback returns an `ExecutionTransactionOutcome`.

The outcome explicitly requests one of two completion semantics:

```txt
commit
rollback
```

Both outcomes contain the callback result.

Execution Transaction interprets the requested completion semantics.

## Commit outcome

A commit outcome requests that transactional changes are preserved.

Execution Transaction must:

```txt
commit transaction
return result
```

### Rule

```txt
commit outcome
→ commit
→ return result
```

## Rollback outcome

A rollback outcome requests that transactional changes are discarded.

Execution Transaction must:

```txt
rollback transaction
return result
```

Returning the result after rollback allows expected business outcomes to remain independent from transaction completion.

### Rule

```txt
rollback outcome
→ rollback
→ return result
```

## Thrown error

If the callback throws an unexpected error, Execution Transaction must:

```txt
rollback transaction
rethrow the original error
```

Unexpected failures are not converted into transaction outcomes.

### Rule

```txt
thrown error
→ rollback
→ rethrow error
```

## Transaction context

Execution Transaction is generic over its transaction context.

The context may contain transaction-bound resources such as repositories or persistence abstractions.

Execution Transaction remains independent from concrete persistence technologies.

## Atomicity

All work performed through the transaction context belongs to one transactional boundary.

A successful commit preserves all participating changes.

A rollback discards all participating changes.

The public contract does not prescribe how atomicity is implemented.

## Invariants

Execution Transaction implementations must preserve the following invariants.

```txt
Each execute() call owns exactly one transaction.

A commit outcome commits before returning its result.

A rollback outcome rolls back before returning its result.

A thrown error rolls back before being rethrown.

A rollback outcome is not an error.

A thrown error is not converted into a transaction outcome.

The transaction completes exactly once.

The transaction context is not used after completion.
```

## Forbidden responsibilities

Execution Transaction must not:

- execute Operations
- resolve OperationHandlers
- evaluate business rules
- interpret OperationResult
- implement retries
- implement idempotency
- manage execution leases
- publish Events
- expose database-specific transaction APIs

Execution Transaction manages transaction lifecycle only.

## Design rules

Execution Transaction must:

- make commit and rollback explicit
- preserve callback results
- distinguish expected rollback from unexpected failure
- remain independent from persistence technology
- remain independently testable

## Core principle

Execution Transaction controls transaction lifecycle.

It guarantees:

```txt
commit outcome
→ commit
→ return result

rollback outcome
→ rollback
→ return result

thrown error
→ rollback
→ rethrow error
```
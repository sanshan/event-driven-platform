# Execution Log Store

Execution Log Store is the infrastructure port responsible for durable and atomic manipulation of the Execution Log.

Execution Log Store belongs to the infrastructure layer.

It defines the persistence contract required by the Runner.

Execution Log Store does not define any storage technology.

## Purpose

Execution Log Store answers:

```txt
How can the Execution Log be atomically read and updated?
```

Execution Log Store does not answer:

```txt
How should an Operation be executed?
Should an Operation be retried?
How should Events be published?
Which database should be used?
```

## Responsibilities

Execution Log Store is responsible for:

* atomically claiming an execution
* atomically completing an execution
* atomically failing an execution
* retrieving persisted execution information
* protecting execution state transitions from concurrent modification

Execution Log Store defines persistence operations only.

## Why this abstraction exists

Execution Log Store intentionally exposes business-oriented execution transitions instead of low-level persistence operations.

It does not expose operations such as:

* create
* update
* save
* delete

These operations would force the Runner to orchestrate multiple persistence steps.

For example:

```txt
find
↓

create entry
↓

create attempt
↓

acquire lease
```

Between these steps another Runner could observe inconsistent state or execute the same business intention concurrently.

Instead, Execution Log Store exposes atomic execution transitions.

Each transition represents one complete persistence operation.

This allows the implementation to preserve execution guarantees while remaining independent from any storage technology.

## Atomic transitions

Execution Log Store provides atomic execution transitions.

Each transition must either:

* complete entirely

or

* have no observable effect.

The public contract does not prescribe how atomicity is achieved.

Implementations may use:

* database transactions
* optimistic concurrency
* compare-and-set
* distributed locks
* other persistence mechanisms

The observable behaviour must remain identical.

## Claim

`claim()` provides exclusive ownership of an execution.

Claim atomically performs:

* locating the existing Execution Log entry
* validating the latest execution state
* validating the active execution lease
* creating a new Execution Attempt when required
* acquiring a new Execution Lease

Possible outcomes are:

* execution claimed
* completed execution found
* execution already in progress
* intent conflict

A completed execution is never claimed again.

If a previous execution has already produced a final OperationResult, that result is returned instead of creating a new execution attempt.

## Complete

`complete()` atomically completes the active execution attempt.

Completion:

* stores the final OperationResult
* removes the active lease
* transitions the execution into its terminal completed state

Business rejections are valid OperationResults.

Therefore both successful execution and business rejection are completed through `complete()`.

## Fail

`fail()` atomically finishes the active execution attempt because of an infrastructure failure.

Typical failures include:

* unexpected exceptions
* transaction failures
* execution timeout
* infrastructure failures

Business validation failures are not handled by `fail()`.

They are represented as OperationResults and completed through `complete()`.

## Execution ownership

Execution Log Store validates execution ownership before applying state transitions.

Ownership is represented by the active Execution Lease.

Only the Runner holding the current lease may complete or fail the execution.

Lease validation protects the Execution Log from stale Runner instances.

## Concurrency

Execution Log Store is responsible for protecting concurrent execution.

Multiple Runner instances may attempt to execute the same business intention simultaneously.

The store guarantees that concurrent execution cannot violate the Execution Log invariants.

The public contract does not prescribe how concurrency is implemented.

## Idempotency

Execution Log Store provides the persisted information required for idempotency.

It exposes previously completed executions to the Runner.

Execution Log Store does not decide whether an execution is idempotent.

That decision belongs to the Runner.

## Persistence

Execution Log Store is independent from persistence technology.

It does not expose:

* SQL
* tables
* collections
* documents
* transactions
* indexes

Different implementations may use different storage technologies while preserving identical execution semantics.

## Invariants

Execution Log Store implementations must preserve the following invariants.

```txt
One intentId maps to at most one ExecutionLogEntry.

One ExecutionLogEntry represents exactly one business intention.

Every ExecutionAttempt belongs to exactly one ExecutionLogEntry.

ExecutionAttempt numbers increase monotonically.

At most one ExecutionAttempt may be in progress.

At most one active ExecutionLease may exist.

A completed execution cannot be claimed again.

A failed execution may create a new ExecutionAttempt.

A stale lease must never complete or fail an execution.

State transitions are atomic.

The persisted Operation snapshot never changes.

The final OperationResult never changes after completion.
```

These invariants must hold regardless of the underlying persistence technology.

## Forbidden responsibilities

Execution Log Store must not:

* execute Operations
* execute OperationHandlers
* evaluate business rules
* perform retries
* evaluate Guards
* publish Events
* publish messages
* access external business systems
* expose database-specific APIs

Execution Log Store is a persistence contract only.

## Design rules

Execution Log Store must:

* preserve atomic execution transitions
* preserve execution ownership
* preserve execution consistency
* preserve Execution Log invariants
* remain deterministic
* remain storage-independent
* remain implementation-independent

## Core principle

Execution Log Store defines the atomic persistence contract of the Execution Log.

It guarantees consistent execution state transitions while remaining independent from both the Runner and the underlying persistence technology.

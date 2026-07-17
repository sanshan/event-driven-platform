# Execution Log

Execution Log is the durable record of Operation execution.

Execution Log belongs to the infrastructure layer.

Execution Log preserves execution history and provides the information required for traceability, idempotency and recovery.

## Purpose

Execution Log answers:

```txt
What happened during the execution of this business intention?
```

Execution Log does not answer:

```txt
How should the Operation be executed?
Should the Operation be retried?
How should Events be published?
```

## Responsibilities

Execution Log is responsible for:

* storing one entry for each business intention
* storing the immutable Operation snapshot
* recording every execution attempt
* storing the final OperationResult
* preserving execution timestamps
* providing execution history
* providing traceability
* providing the persisted information required for idempotency

Execution Log contains execution history only.

## Execution Log entry

One `ExecutionLogEntry` represents one business intention.

The business intention is identified by its deterministic `intentId`.

The same business intention may have multiple execution attempts.

```txt
ExecutionLogEntry
├── Operation snapshot
├── attempt count
├── latest attempt
└── final OperationResult
```

All attempts belong to the same Execution Log entry.

A new retry creates a new execution attempt. An existing attempt is never reused.

## Execution attempt

`ExecutionAttempt` represents one concrete attempt to execute the Operation.

An attempt contains:

* attempt identifier
* execution identifier
* attempt number
* correlation identifier
* Runner identifier
* lease version
* start timestamp
* finish timestamp
* execution failure, when applicable
* attempt status

An attempt may be:

```txt
in-progress
completed
failed
timed-out
```

`ExecutionAttempt.status` is the single source of execution state.

`ExecutionLogEntry` does not store a separate status.

The state of an Execution Log entry is determined by its latest attempt.

```txt
latestAttempt.status = in-progress
→ execution is in progress

latestAttempt.status = completed
→ execution is completed

latestAttempt.status = failed
→ execution has failed

latestAttempt.status = timed-out
→ execution has timed out
```

This prevents the entry state and attempt state from diverging.

## Stored information

An Execution Log entry contains:

* execution identifier
* intent identifier
* immutable Operation snapshot
* number of execution attempts
* latest execution attempt
* active execution lease, when execution is in progress
* final OperationResult, when execution is completed
* creation timestamp
* final completion timestamp, when applicable

The correlation identifier belongs to an execution attempt because different attempts may be started from different execution contexts.

The Operation snapshot preserves the business intention that was submitted for execution.

The final OperationResult preserves the business outcome required to satisfy repeated execution of the same Intent.

## Operation snapshot

Execution Log stores the complete serialized Operation snapshot.

The snapshot preserves:

* Operation name
* Operation schema version
* Intent
* Actor
* Subject
* Aggregate identifier
* business payload

The stored snapshot must be sufficient to identify and investigate the exact business action that was submitted for execution.

Execution Log does not decide how an older Operation schema is deserialized or executed. Operation schema evolution belongs to the corresponding serialization and handler infrastructure.

## OperationResult

A completed execution stores the final `OperationResult`.

The final result may represent:

* successful execution
* committed business rejection
* rolled-back business rejection

A business rejection is a valid completed execution.

Infrastructure failures are not `OperationResult` values. They are recorded on the corresponding `ExecutionAttempt`.

## Idempotency

Execution Log provides the persisted information required for idempotency.

If an Operation with the same deterministic `intentId` has already produced a final `OperationResult`, the previously stored result can be returned without executing the Operation again.

Idempotency decisions are made by the Runner.

Execution Log does not evaluate idempotency policy. It only stores and exposes the required execution state and result.

## Execution ownership

An in-progress Execution Log entry contains an active `ExecutionLease`.

The lease identifies temporary ownership of the execution.

It contains:

* lease owner identifier
* lease version
* acquisition timestamp
* expiration timestamp

The lease protects execution transitions from stale or competing Runner instances.

Lease acquisition and state transitions are performed atomically by the Execution Log storage infrastructure.

The Execution Log models describe the persisted state. They do not implement lease acquisition or concurrency control themselves.

## Traceability

Execution Log provides a durable audit trail of Operation execution.

The Operation snapshot preserves:

* which business intention was submitted
* who initiated it
* which subject owned the action
* which Aggregate was targeted
* which business data was provided

Execution attempts preserve:

* how many attempts were made
* which Runner executed each attempt
* which correlation context initiated each attempt
* when each attempt started and finished
* whether the attempt completed, failed or timed out
* which infrastructure failure occurred

The final OperationResult preserves the final business outcome.

## Persistence

The public model does not require the entry and attempts to be stored in one physical record.

A persistence implementation may use separate storage structures:

```txt
execution_log_entries
execution_attempts
```

The store may reconstruct an `ExecutionLogEntry` together with its latest attempt when reading it.

Physical persistence design must not change the public execution semantics.

## Mutability

An Execution Log entry may evolve while execution is active.

The infrastructure may:

* acquire or replace an expired lease
* append a new execution attempt
* update the latest attempt
* persist the final OperationResult
* transition the execution into a terminal state

Previously finished attempts must not be rewritten or reused.

After successful completion, the final Operation snapshot and `OperationResult` must be immutable.

A completed execution must never be claimed or executed again for the same `intentId`.

## Invariants

Execution Log must preserve the following invariants:

```txt
One intentId maps to at most one ExecutionLogEntry.

One ExecutionLogEntry represents exactly one business intention.

Every execution attempt belongs to exactly one ExecutionLogEntry.

Attempt numbers increase monotonically.

A new retry creates a new ExecutionAttempt.

An existing ExecutionAttempt is never reused.

At most one attempt may be in progress for an ExecutionLogEntry.

An in-progress execution has an active lease.

A terminal execution has no active lease.

A completed execution has a final OperationResult.

A failed or timed-out attempt contains an ExecutionFailure.

A completed attempt does not contain an ExecutionFailure.

The state of an entry is determined only by its latest attempt.
```

## Forbidden responsibilities

Execution Log must not:

* execute Operations
* execute OperationHandlers
* resolve OperationHandlers
* evaluate business rules
* decide whether an execution should be retried
* apply retry policies
* evaluate Guards
* apply rate limits
* manage execution timeouts
* publish Events
* publish messages
* write directly to message brokers
* access business external systems

Execution Log is persisted execution history only.

## Design rules

Execution Log must:

* preserve the complete Operation snapshot
* preserve every finished execution attempt
* preserve the final OperationResult
* use the latest attempt as the single source of execution state
* support deterministic idempotency
* support atomic ownership transitions
* support recovery and investigation
* support observability
* remain independent from Runner execution policy
* remain independent from physical storage technology

## Core principle

Execution Log is the durable history of Operation execution.

It records:

```txt
which business intention was submitted
which Operation represented that intention
which execution attempts were made
how the latest attempt finished
which final business result was produced
```

Execution Log does not execute anything.

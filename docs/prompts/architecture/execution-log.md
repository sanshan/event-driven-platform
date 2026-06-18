# Execution Log

Execution Log is the persistent history of Operation execution.

Execution Log is owned by Runner.

Execution Log records what was executed, when it was executed, who executed it, and what Result was produced.

## Responsibilities

Execution Log is responsible for storing:

* intentId
* correlationId
* actor
* subject
* operation name
* operation input
* execution status
* result
* timestamps
* execution metadata

Every Operation execution attempt must be observable through Execution Log.

## Purpose

Execution Log provides:

* execution history
* traceability
* auditability
* operational diagnostics
* idempotency lookup
* retry analysis
* failure investigation

Execution Log is not a business read model.

## Ownership

Runner owns Execution Log.

Operations do not write Execution Log.

Use Cases do not write Execution Log.

Controllers, consumers, cron jobs and webhooks do not write Execution Log directly.

## Execution lifecycle

Execution Log should represent the lifecycle of execution.

Common statuses:

* pending
* running
* succeeded
* rejected
* failed

Rejected means the Operation completed with a business rejection.

Failed means execution failed because of a technical failure.

## Idempotency lookup

Execution Log is used by Runner for idempotency lookup.

When Runner receives a Command with intentId:

* Runner checks Execution Log
* if a completed execution exists, Runner returns the previously recorded Result
* if no completed execution exists, Runner continues execution

Idempotency behavior is defined in `idempotency.md`.

Execution Log only stores the data required to support it.

## Result persistence

Runner persists Operation Result into Execution Log.

The persisted Result may contain:

* success outcome
* rejection outcome
* reason
* emitted events metadata

Execution Log must preserve the Result exactly enough to return it for repeated intentId execution.

## Correlation

Execution Log must store correlationId.

correlationId is used for tracing execution across:

* REST requests
* gRPC requests
* consumers
* cron jobs
* webhooks
* nested use case flows

correlationId is not an idempotency key.

## Timestamps

Execution Log should store timestamps such as:

* createdAt
* startedAt
* finishedAt
* failedAt

Timestamps must be generated consistently.

Use timestamps for diagnostics and observability, not for idempotency identity.

## Failures

Technical failures should be recorded.

Failure records should include:

* failure type
* safe failure message
* retry metadata when available
* timestamps
* execution duration

Do not store secrets or sensitive payloads in failure details.

## Immutability

Execution Log should be append-oriented or immutable where practical.

Completed execution records should not be modified except for controlled status transitions.

Execution history must not be silently overwritten.

## Retention

Retention policy is an operational decision.

Retention must consider:

* idempotency window
* audit requirements
* debugging needs
* storage cost
* compliance requirements

Do not remove records required for active idempotency guarantees.

## Observability

Execution Log should support operational investigation.

It should be possible to answer:

* was this intent executed?
* who executed it?
* what Operation was executed?
* what Result was produced?
* did execution fail or reject?
* how long did execution take?
* which correlationId connects related work?

## Forbidden responsibilities

Execution Log must not:

* execute Operations
* make business decisions
* publish Events
* manage retries
* replace Outbox
* replace domain read models

Execution Log is execution history only.

## Design rules

Execution Log should:

* be reliable
* be queryable
* be durable
* support idempotency lookup
* support traceability
* preserve Results
* distinguish rejection from technical failure
* avoid storing secrets
* remain owned by Runner

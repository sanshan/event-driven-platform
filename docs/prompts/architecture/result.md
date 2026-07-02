# Result

Result is the outcome of Operation execution.

Every Operation produces exactly one Result.

Result is the contract between Operation and Runner.

## Responsibilities

Result represents:

* successful execution
* rejected execution
* execution outcome
* emitted events

Result contains no execution logic.

## Success

Successful Result may contain:

* outcome data
* emitted events
* metadata

Success indicates that business rules were satisfied.

## Rejection

Rejected Result may contain:

* rejection reason
* rejection code
* metadata

Rejection is a valid business outcome.

Rejection is not a technical failure.

## Events

Result may contain Events.

Events describe facts produced by successful business execution.

Events are persisted by Runner.

Result does not publish Events.

## Technical failures

Infrastructure failures are not Results.

Examples:

* database unavailable
* timeout
* network failure

These are execution failures handled by Runner.

## Design rules

Results should:

* be immutable
* be deterministic
* be serializable
* represent business outcomes only

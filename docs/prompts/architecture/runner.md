# Runner

Runner is the centralized write-side execution engine.

Runner executes Commands.

Runner is infrastructure-oriented.

Runner provides operational guarantees around Operation execution.

## Responsibilities

Runner is responsible for:

* command execution
* operation invocation
* execution logging
* idempotency
* retry handling
* timeout handling
* rate limiting
* result persistence
* outbox persistence

## Execution flow

Command
→ Runner
→ Operation
→ Result
→ Execution Log
→ Outbox

## Idempotency

Runner owns idempotency.

Repeated execution of the same intentId must return the previously recorded Result.

Operations must not implement their own idempotency.

## Execution log

Every execution must be recorded.

Execution log contains:

* intentId
* correlationId
* operation
* result
* timestamps

Execution log is the source of:

* idempotency
* execution history
* traceability

## Events

Operations may produce Events through Result.

Runner persists Events into Outbox.

Runner does not publish Events directly.

## Forbidden responsibilities

Runner must not:

* contain business rules
* make business decisions
* implement domain logic

Runner is execution infrastructure only.

## Design rules

Runner should provide:

* deterministic execution
* observability
* traceability
* repeatability
* reliability

All write-side execution flows through Runner.

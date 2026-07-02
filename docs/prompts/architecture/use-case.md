# Use Case

A Use Case is an application-layer workflow.

A Use Case exists only inside a microservice application layer.

A Use Case represents a business scenario that coordinates one or more domain Operations.

Use Cases are scenario-oriented.

Operations are domain-action-oriented.

## Purpose

A Use Case answers:

```txt
Why should this business action be executed?
```

Examples:

```txt
ActivateMyProfile
ActivateProfileByPlatform
CreateMyNewWallet
ApproveWithdrawalByAdmin
```

Different Use Cases may execute the same Operation.

Example:

```txt
ActivateMyProfile
  -> ActivateProfile Operation

ActivateProfileByPlatform
  -> ActivateProfile Operation
```

## Responsibilities

A Use Case is responsible for:

* receiving application input
* resolving actor context
* resolving subject context
* preparing Operation payload
* creating Commands
* executing Commands through Runner
* coordinating multiple Commands
* combining Results
* implementing workflow orchestration

## Allowed

A Use Case may:

* create Operations
* create Commands
* call Runner
* execute Commands sequentially
* execute Commands conditionally
* execute Commands in parallel
* use Results from previous Commands
* call application-layer services
* access infrastructure through ports when domain participation is not required

## Forbidden

A Use Case must not:

* execute Operations directly
* call other Use Cases
* contain domain rules
* validate domain invariants
* mutate Aggregates
* persist Aggregates
* own Aggregate lifecycle
* publish messages
* access Kafka directly
* access Redpanda directly
* access Debezium directly
* implement retries
* implement idempotency
* implement rate limiting
* write execution logs
* write outbox records
* bypass Runner

## Aggregate Rule

A Use Case does not own Aggregates.

A Use Case may read data only for workflow orchestration.

A Use Case must not load Aggregates for domain decision making.

A Use Case must not pass Aggregate instances into Operations.

Use Cases pass only:

* intent
* actor
* aggregate identifier
* payload

## Design Principles

Use Cases should:

* remain thin
* coordinate workflows
* delegate domain decisions to Operations
* delegate execution concerns to Runner
* remain application-specific
* remain independent from infrastructure implementation details

## Architecture Rule

Use Case belongs only to:

```txt
application/
```

Use Cases must never exist in:

```txt
domain/
infrastructure/
```

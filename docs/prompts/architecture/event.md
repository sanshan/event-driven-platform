# Event

Event represents a business fact that has already happened.

Events are produced by successful Operations.

Events describe state changes.

Events are immutable.

## Responsibilities

Events are responsible for:

* communicating business facts
* describing completed state transitions
* informing downstream systems

Events contain no behavior.

## Examples

Examples:

* UserCreated
* UserLocked
* DepositCreated
* WithdrawalApproved
* KycApproved

Events should be expressed in business language.

## Ownership

Operations may produce Events through Result.

Runner persists Events into Outbox.

CDC publishes Events.

Responsibilities must remain separated.

## Event contents

Events should contain:

* eventId
* eventType
* occurredAt
* aggregateId
* event payload

Events should contain only information required by consumers.

## Immutability

Events must never be modified after creation.

New facts require new Events.

Events are append-only.

## Forbidden responsibilities

Events must not:

* execute logic
* publish themselves
* call services
* update state
* trigger workflows directly

Events are facts only.

## Design rules

Events should:

* be immutable
* be serializable
* be versionable
* be business-oriented
* be durable

# Command

Command transports an Operation through the execution pipeline.

Command is infrastructure-oriented.

Command contains execution metadata.

Command contains no business logic.

## Responsibilities

Command is responsible for carrying:

* Operation
* execution options
* timeout configuration
* retry configuration
* rate-limit configuration
* execution context

## Command lifecycle

Command is created by:

* REST endpoints
* gRPC endpoints
* consumers
* schedulers
* webhooks
* use cases

Command is executed by Runner.

## Forbidden responsibilities

Command must not:

* contain business rules
* contain business decisions
* execute infrastructure directly
* publish messages
* modify domain state

## Design rules

Commands should:

* be immutable
* be serializable
* be deterministic
* contain execution metadata only

Commands exist to separate business intent from execution concerns.

# Use Case

Use Case orchestrates business execution flows.

Use Case coordinates Operations.

Use Case is the entry point for business workflows.

## Responsibilities

Use Case is responsible for:

* executing Operations
* sequencing Operations
* coordinating Operations
* combining Results
* handling workflow logic

Use Case may execute one or many Operations.

## Execution patterns

Use Cases may execute Operations:

* sequentially
* in parallel
* conditionally

Use Cases may use results from previous Operations.

## Allowed responsibilities

Use Cases may:

* call Runner
* coordinate workflows
* aggregate results
* manage execution flow

## Forbidden responsibilities

Use Cases must not:

* contain infrastructure logic
* publish messages
* access Kafka directly
* access Redpanda directly
* implement idempotency
* implement retry logic
* bypass Runner

## Example

Example workflow:

Register User

* Create User Operation
* Create Wallet Operation
* Create Profile Operation

Use Case orchestrates execution.

Operations remain reusable and independent.

## Design rules

Use Cases should:

* represent business workflows
* remain thin
* delegate business decisions to Operations
* delegate execution concerns to Runner

# Intent

Intent represents a deterministic business intention to execute an Operation.

Intent is not an Operation.

Intent identifies why an Operation is being executed.

Intent is the basis for idempotency.

## Responsibilities

Intent is responsible for:

* identifying business intention
* providing deterministic execution identity
* preventing duplicate execution
* connecting retries to the same business action

## Intent ID

Every intent has intentId.

intentId must be deterministic.

The same business intention must produce the same intentId.

Different business intentions must produce different intentIds.

## Examples

Examples:

* register-user:{tenantId}:{email}
* approve-withdrawal:{tenantId}:{withdrawalId}:{approvalStep}
* lock-user:{tenantId}:{userId}:{reason}
* create-deposit:{tenantId}:{paymentId}
* process-webhook:{provider}:{externalEventId}

## Intent vs Operation

Intent identifies the business intention.

Operation performs the business action.

Command transports the Operation.

Runner executes the Command.

## Intent vs Correlation

intentId is used for idempotency.

correlationId is used for tracing.

The same correlationId may include multiple intents.

The same intentId must always represent one business intention.

## Determinism

Intent generation must not depend on:

* random values
* current time
* process memory
* retry attempt number
* transport-specific metadata

Intent generation must depend only on stable business inputs.

## Scope

Intent may be created by:

* REST endpoint
* gRPC endpoint
* message consumer
* webhook handler
* cron job
* use case

The source does not change the meaning of intent.

## Reuse

Retrying the same request must reuse the same intentId.

Replaying the same external event must reuse the same intentId.

Manual re-execution of the same business action must reuse the same intentId only when it is truly the same intention.

## Forbidden responsibilities

Intent must not:

* execute logic
* contain retry behavior
* contain transport logic
* contain infrastructure logic
* replace Operation

Intent is identity, not execution.

## Design rules

Intent should:

* be deterministic
* be stable
* be explainable
* be traceable
* be derived from business identifiers

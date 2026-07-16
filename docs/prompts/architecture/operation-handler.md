# OperationHandler

OperationHandler executes one specific type of Operation.

OperationHandler contains the business execution logic required to perform that Operation.

OperationHandler does not execute Commands.

## Purpose

OperationHandler answers:

```txt
How is this specific Operation performed?
```

OperationHandler does not answer:

```txt
How is the Command executed?
How are retries performed?
How is idempotency guaranteed?
How is execution logged?
How are Events persisted or published?
```

## Operation association

Each Operation type must have a corresponding OperationHandler.

Example:

```txt
CreateWalletOperation
→ CreateWalletOperationHandler
```

An OperationHandler handles exactly one Operation type.

OperationHandler must not resolve or select Operations through conditional dispatch.

```ts
switch (operation.name) {
  // forbidden
}
```

Handler resolution is outside the responsibility of OperationHandler.

## Responsibilities

OperationHandler is responsible for:

* executing one specific Operation
* loading the domain state required by the Operation
* evaluating business rules and invariants
* changing domain state
* persisting domain state through transactional dependencies
* producing an OperationResult
* producing Events as part of an OperationResult

OperationHandler contains business execution logic only.

## Execution contract

OperationHandler receives an Operation and returns an OperationResult.

```txt
Operation
→ OperationHandler
→ OperationResult
```

The exact Operation and OperationResult types are defined by the concrete handler.

A handler must return only outcomes that belong to its declared result union.

## Transaction boundary

OperationHandler is executed inside a transaction managed externally.

OperationHandler does not:

* create a transaction
* commit a transaction
* roll back a transaction
* control transaction lifecycle

OperationHandler performs its work through dependencies associated with the active transaction.

OperationHandler must not depend on a concrete transaction implementation unless that implementation is itself part of an explicitly defined transactional dependency contract.

## Transactional outcome

OperationHandler communicates the business and transactional outcome through OperationResult.

The possible result categories are:

```txt
success
committed rejection
rolled-back rejection
```

OperationHandler does not commit or roll back the transaction directly.

It returns the appropriate OperationResult variant.

A successful result means that produced changes must be preserved.

A committed rejection means that the Operation was rejected, but produced changes must be preserved.

A rolled-back rejection means that the Operation was rejected and produced changes must be discarded.

## External interactions

OperationHandler must not interact with external APIs or perform non-transactional external side effects.

External systems cannot participate in the local transaction in which OperationHandler executes.

An external side effect cannot be rolled back together with local transactional changes.

OperationHandler must not directly perform:

* HTTP requests
* gRPC requests
* external service calls
* message publication
* email delivery
* notification delivery
* external payment execution
* external file storage operations
* other non-transactional external side effects

Required external side effects must be represented through Events produced as part of OperationResult.

OperationHandler produces Events as data.

OperationHandler does not persist or publish Events.

## OperationResult

OperationHandler returns an OperationResult representing the business outcome of the Operation.

OperationResult may contain:

* successful business data
* rejection reason
* rejection data
* produced Events
* transactional completion semantics

Expected business rejection must be returned as an OperationResult.

Expected business rejection must not be represented as an exception.

OperationHandler may return:

* SuccessfulOperationResult
* CommittedOperationRejection
* RolledBackOperationRejection

The exact OperationResult contract is defined separately.

## Errors

OperationHandler may raise an error when execution cannot produce a valid business result.

Examples include:

* unavailable persistence dependency
* unexpected persistence failure
* corrupted or inconsistent stored data
* violated internal implementation assumption
* unexpected dependency failure

Unexpected execution failures must not be converted into business rejection results.

## Events

OperationHandler may produce Events through OperationResult.

Events represent business facts produced by the Operation outcome.

SuccessfulOperationResult may contain Events.

CommittedOperationRejection may contain Events.

RolledBackOperationRejection must not contain Events.

OperationHandler must not:

* persist Events
* publish Events
* write directly to Outbox
* select Topics
* depend on messaging infrastructure

## Dependencies

OperationHandler may depend on:

* domain services
* domain policies
* transactional repositories
* transactional persistence abstractions
* deterministic business utilities required by the Operation

Dependencies must be explicit.

OperationHandler should normally receive dependencies through construction.

OperationHandler must not depend on:

* Runner
* Command
* retry infrastructure
* timeout infrastructure
* rate limiting infrastructure
* idempotency infrastructure
* execution logging infrastructure
* Outbox infrastructure
* messaging clients
* external API clients

## Operation orchestration

OperationHandler must not execute other Operations.

OperationHandler must not invoke other OperationHandlers.

OperationHandler must not invoke Runner.

Coordination of multiple Operations belongs to a Use Case.

Calling a domain service is allowed when that service does not execute Operations and remains inside the same business and transactional boundary.

## State

OperationHandler must not maintain mutable execution state between invocations.

OperationHandler dependencies should normally be immutable.

Each execution must depend only on:

* the supplied Operation
* explicit dependencies
* transactional domain state

OperationHandler should be safe to reuse across multiple executions.

## Determinism

OperationHandler should not depend on hidden sources of nondeterminism.

Values such as current time, generated identifiers or random values should be obtained through explicit dependencies when they affect business behavior or produced data.

This keeps OperationHandler independently testable and makes its behavior explicit.

## Forbidden responsibilities

OperationHandler must not:

* execute Commands
* resolve handlers
* manage transactions
* implement retries
* implement timeout handling
* implement rate limiting
* implement idempotency
* create execution logs
* persist Outbox records
* publish messages
* interact with external APIs
* execute other Operations
* invoke other OperationHandlers
* orchestrate workflows

## Design rules

OperationHandler must be:

* specific to one Operation type
* explicit about its OperationResult union
* business-oriented
* transaction-compatible
* independently testable
* explicit in its dependencies
* free from execution infrastructure concerns
* free from non-transactional external side effects
* stateless between executions

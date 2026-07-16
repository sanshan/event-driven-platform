# OperationHandler

OperationHandler executes one specific type of Operation.

OperationHandler contains the business execution logic required to perform the Operation.

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
How are Events published?
```

## Operation association

Each Operation type must have a corresponding OperationHandler.

Example:

```txt
CreateWalletOperation
→ CreateWalletOperationHandler
```

OperationHandler must handle exactly one Operation type.

OperationHandler must not select Operations through conditional dispatch.

```ts
switch (operation.name) {
  // forbidden
}
```

Handler resolution is outside the responsibility of OperationHandler.

## Responsibilities

OperationHandler is responsible for:

* executing one specific Operation
* loading required domain state
* evaluating business rules and invariants
* changing domain state
* persisting domain state through transactional dependencies
* producing an Operation Result
* producing Events as part of the Result

OperationHandler contains business execution logic only.

## Transaction boundary

OperationHandler is executed inside a transaction managed externally.

OperationHandler does not create, commit or roll back transactions.

OperationHandler must use dependencies associated with the transaction in which it is executed.

OperationHandler must not control transaction lifecycle.

## External interactions

OperationHandler must not interact with external APIs.

OperationHandler is executed inside a local transaction, while external systems cannot participate in that transaction.

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

External side effects must be represented through Events produced by the OperationHandler.

OperationHandler produces Events as data.

OperationHandler does not publish Events.

## Result

OperationHandler returns the Result of the Operation execution.

The Result represents the business outcome of the Operation.

A Result may represent:

* successful execution
* business rejection
* produced Events

Expected business rejection must be returned as a Result.

Unexpected infrastructure or execution failures may be raised as errors.

The exact Result contract is defined separately.

## Events

OperationHandler may produce Events through the Result.

Events describe facts produced by the completed business action.

OperationHandler must not:

* publish Events
* write directly to Outbox
* select Topics
* depend on messaging infrastructure

## Dependencies

OperationHandler may depend on domain services and transactional persistence abstractions required to execute its Operation.

Dependencies should be explicit.

OperationHandler should not depend on:

* Runner
* Command
* retry infrastructure
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

## State

OperationHandler should not maintain mutable execution state between invocations.

OperationHandler dependencies should normally be immutable.

Each execution must depend only on:

* the supplied Operation
* explicit dependencies
* transactional domain state

## Forbidden responsibilities

OperationHandler must not:

* execute Commands
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
* orchestrate workflows

## Design rules

OperationHandler should be:

* specific to one Operation type
* business-oriented
* transaction-compatible
* independently testable
* explicit in its dependencies
* free from execution infrastructure concerns
* free from external side effects

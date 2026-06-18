# Operation

Operation is the fundamental write-side business action.

An Operation represents a single atomic business intent.

Examples:

* Create User
* Lock User
* Approve KYC
* Create Deposit
* Approve Withdrawal

Operations are business-oriented.

Operations must be reusable.

Operations must be deterministic.

Operations must not know about infrastructure concerns.

## Responsibilities

Operation is responsible for:

* validating business rules
* evaluating business invariants
* deciding business outcomes
* producing Result

Operation may emit Events through Result.

## Required fields

Every Operation contains:

* intentId
* correlationId
* actor
* subject
* operation-specific data

## Forbidden responsibilities

Operation must not:

* execute other Operations
* publish messages
* interact with Kafka
* interact with Redpanda
* interact with Debezium
* manage retries
* manage rate limits
* manage idempotency
* manage outbox persistence
* manage execution logs
* manage cache invalidation

## Execution

Operations are executed only through Runner.

Operations are never executed directly from controllers, consumers or jobs.

## Design rules

Operations should:

* represent business language
* be independently testable
* be deterministic
* have explicit inputs
* return explicit Results

Operations should not depend on transport mechanisms.

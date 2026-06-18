# Operation

An Operation is a pure immutable description of a domain action over a single Aggregate.

Operation belongs to the domain layer.

Operation is not executable by itself.

Operation contains no workflow logic.

Operation contains no infrastructure concerns.

Operation is reusable across multiple Use Cases.

## Purpose

An Operation answers:

```txt
What domain action should happen?
```

Examples:

```txt
ActivateProfile
DisableProfile
VerifyProfile
CreateProfile
CreateWallet
ApproveWithdrawal
RejectWithdrawal
```

Operations describe domain intent.

Operations do not describe workflows.

## Responsibilities

Operation is responsible only for carrying:

* operation name
* intent
* actor
* aggregate identifier
* payload

Operation contains no execution logic.

Operation contains no infrastructure logic.

Operation contains no orchestration logic.

## Related Concepts

Operation depends on the following architectural concepts:

* Intent
* Actor
* Aggregate Identifier

These concepts are defined in separate architecture documents.

Operation uses them but does not define them.

## Abstract Interface

```ts
export interface IOperation<
  TPayload,
  TAggregateId
> {
  readonly name: string;

  readonly intent: Intent;

  readonly actor: Actor;

  readonly aggregateId: TAggregateId;

  readonly payload: TPayload;
}
```

## Aggregate Rule

Every Operation targets exactly one Aggregate.

Operation must contain an Aggregate identifier.

Operation must not contain Aggregate instances.

Operation must not load Aggregates.

Operation must not save Aggregates.

Aggregate lifecycle belongs to Command Handlers.

## Allowed

Operations may contain:

* domain identifiers
* business payload
* actor information
* intent information

## Forbidden

Operations must not:

* execute themselves
* execute other Operations
* access repositories
* access infrastructure
* access databases
* access caches
* publish messages
* access messaging infrastructure
* manage retries
* manage idempotency
* manage execution logs
* manage outbox persistence
* manage cache invalidation

## Operation Granularity

Operations should represent domain actions.

Prefer:

```txt
ActivateProfile
DisableProfile
VerifyProfile
CreateProfile
CreateWallet
ApproveWithdrawal
RejectWithdrawal
```

Avoid generic CRUD-style Operations:

```txt
UpdateProfile
UpdateWallet
UpdateWithdrawal
```

The Operation name should clearly communicate domain intent.

## Architecture Rule

Operations belong only to:

```txt
domain/
```

Operations must never exist in:

```txt
application/
infrastructure/
```

## Core Principle

Operation is only:

```txt
A description of who performs what action,
on which Aggregate,
with which Intent,
and with which Payload.
```

Operation is not:

```txt
Execution.
Workflow.
Infrastructure.
Persistence.
Messaging.
```

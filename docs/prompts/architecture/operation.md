# Operation

Operation represents a pure immutable description of a single domain action over exactly one Aggregate.

Operation belongs to the domain layer.

Operation is reusable across multiple Use Cases.

## Purpose

Operation answers:

```txt
What domain action should happen?
```

Examples:

```txt
ActivateProfile
DisableProfile
VerifyProfile
CreateWallet
ApproveWithdrawal
RejectWithdrawal
```

## Responsibilities

Operation is responsible only for carrying:

- operation name
- intent
- correlation id
- actor
- subject
- aggregate identifier
- business payload

## Public API

```ts
export interface Operation<
  TPayload,
  TAggregateId,
> {
  readonly name: string;

  readonly intent: Intent;

  readonly correlationId: string;

  readonly actor: Actor;

  readonly subject: Subject;

  readonly aggregateId: TAggregateId;

  readonly payload: TPayload;
}
```

## Aggregate Rule

Every Operation targets exactly one Aggregate.

Operation contains only the Aggregate identifier.

Aggregate loading and persistence are outside of Operation.

## Allowed

Operation may contain:

- domain identifiers
- business payload

## Forbidden

Operation must not:

- contain execution logic
- orchestrate other Operations
- access infrastructure
- access repositories
- publish events
- manage retries
- manage idempotency
- manage execution logging

## Naming

Operation names should represent business actions.

Prefer:

```txt
ActivateProfile
DisableProfile
ApproveWithdrawal
RejectWithdrawal
```

Avoid:

```txt
UpdateProfile
UpdateWallet
UpdateWithdrawal
```

## Core Principle

Operation is a pure immutable description of:

- what domain action should happen;
- who initiated it;
- whose domain context is affected;
- which Aggregate should handle it;
- under which Intent and Correlation;
- with which business payload.
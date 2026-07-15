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

* operation name
* intent
* actor
* subject
* aggregate identifier
* business payload

## Public API

```ts
export interface Operation<
  TName extends string,
  TAggregateId,
  TPayload,
  TResult,
> {
  readonly name: TName;

  readonly intent: Intent;

  readonly actor: Actor;

  readonly subject: Subject;

  readonly aggregateId: TAggregateId;

  readonly payload: TPayload;
}
```

The result type is part of the static Operation contract.

It is not runtime data carried by Operation.

## Intent

Every Operation carries an Intent.

Intent identifies the exact business intention represented by the Operation.

Repeated execution of the same Intent represents repeated execution of the same business intention.

Operation carries Intent but does not implement idempotency.

## Actor

Operation carries the Actor that initiated the domain action.

## Subject

Operation carries the Subject affected by the domain action.

## Aggregate rule

Every Operation targets exactly one Aggregate.

Operation contains only the Aggregate identifier.

Operation does not contain the Aggregate instance.

## Payload

Operation carries the business data required to describe the domain action.

Payload is specific to the concrete Operation.

Payload must not contain execution or infrastructure concerns.

## Result type

Every Operation defines the type of business outcome it is expected to produce.

The result type is associated with Operation at the type-system level.

The result type must not be independently defined by Command.

Examples:

```txt
ActivateProfileOperation -> ProfileActivated
CreateWalletOperation -> WalletCreated
ApproveWithdrawalOperation -> WithdrawalApproved
```

## Allowed

Operation may contain:

* domain identifiers
* business values
* business payload

## Forbidden

Operation must not:

* contain execution logic
* orchestrate other Operations
* execute other Operations
* access infrastructure
* access repositories
* access caches
* publish events
* publish messages
* manage retries
* manage rate limits
* manage timeouts
* manage idempotency
* manage execution logging
* contain correlation metadata

## Naming

Operation names must represent explicit business actions.

Prefer:

```txt
ActivateProfile
DisableProfile
ApproveWithdrawal
RejectWithdrawal
```

Avoid vague names:

```txt
UpdateProfile
UpdateWallet
UpdateWithdrawal
```

## Design rules

Operations must:

* use business language
* be immutable
* be reusable
* be serializable
* describe exactly one domain action
* target exactly one Aggregate
* define a single unambiguous result contract
* contain business intent only

## Core principle

Operation is a pure immutable description of:

* what domain action should happen
* who initiated it
* which business entity is affected
* which Aggregate should handle it
* which business intention it represents
* which business data is required

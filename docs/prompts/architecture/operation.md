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
* operation schema version
* intent
* actor
* subject
* aggregate identifier
* business payload

## Public API

```ts
export interface Operation<
  TName extends string,
  TSchemaVersion extends number,
  TAggregateId,
  TPayload,
  TResult,
> {
  readonly name: TName;

  readonly schemaVersion: TSchemaVersion;

  readonly intent: Intent;

  readonly actor: Actor;

  readonly subject: Subject;

  readonly aggregateId: TAggregateId;

  readonly payload: TPayload;
}
```

The result type is part of the static Operation contract.

It is not runtime data carried by Operation.

## Schema version

Every Operation carries a schema version.

The schema version identifies the version of the serialized Operation contract.

The Operation contract is identified by the combination of:

```txt
operation name + schema version
```

Example:

```txt
CreateWallet + 1
ApproveWithdrawal + 2
```

Schema versions start from `1`.

A published Operation schema version must remain immutable.

Breaking changes to the serialized Operation contract require a new schema version.

Schema version must not be used as:

* application version
* service version
* deployment version
* release number

## Intent

Every Operation carries an Intent.

Intent identifies the exact business intention represented by the Operation.

Repeated execution of the same Intent represents repeated execution of the same business intention.

Operation carries Intent but does not implement idempotency.

Schema version does not independently define business intention.

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

Payload is specific to the concrete Operation and its schema version.

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

Operation version must not be encoded only in the name.

Prefer:

```txt
name: CreateWallet
schemaVersion: 1
```

Avoid:

```txt
name: CreateWalletV1
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
* carry an explicit schema version
* preserve published schema versions
* contain business intent only

## Core principle

Operation is a pure immutable description of:

* what domain action should happen
* which version of the Operation contract describes it
* who initiated it
* which business entity is affected
* which Aggregate should handle it
* which business intention it represents
* which business data is required
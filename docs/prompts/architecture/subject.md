# Subject

Subject represents the primary domain context affected by an Operation.

Subject identifies who or what the target Aggregate belongs to.

Subject is immutable.

Subject belongs to the domain layer.

## Purpose

Subject answers:

```txt
Whose domain context is affected?
```

Subject does not answer:

```txt
Who initiated the Operation?
Which Aggregate executes the Operation?
What business data is required?
```

## Responsibilities

Subject is responsible only for carrying:

- subject type
- subject identifier

Subject is identity, not state.

## Public API

```ts
export interface Subject {
  readonly type: string;

  readonly id: string;
}
```

## Fields

### type

Identifies the business subject category.

Examples:

```txt
user
tenant
organization
merchant
account
system
```

### id

Identifies the specific business subject.

Examples:

```txt
user-123
tenant-42
merchant-7
system
```

The identifier must be stable for the lifetime of the Subject.

## Subject vs Actor

Actor identifies who initiated the Operation.

Subject identifies whose domain context is affected.

Example:

```txt
Actor:
support-agent-17

Subject:
user-123
```

## Subject vs Aggregate

Subject identifies the owner or primary business context of an Aggregate.

Aggregate identifies the object that executes the Operation.

One Subject may own many Aggregates.

Example:

```txt
Subject:
user-123

Aggregate:
wallet-17
```

## Subject vs Payload

Subject identifies the business context.

Payload contains the business data required to perform the Operation.

Payload may reference other domain objects, but they do not become the Subject.

## Examples

```txt
Actor:
user/admin-1

Subject:
user/user-42

Aggregate:
wallet-17

Operation:
BlockWallet
```

```txt
Actor:
service/payment-service

Subject:
tenant/tenant-5

Aggregate:
invoice-91

Operation:
GenerateInvoice
```

## Core Principle

Subject is only:

```txt
A stable identity of the primary business context affected by an Operation.
```

Subject is not:

```txt
Actor.

Aggregate.

Payload.

Business state.

Execution metadata.
```
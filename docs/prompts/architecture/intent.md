# Intent

Intent represents the deterministic identity of exactly one business intention.

Intent is not an Operation.

Intent is not a Command.

Intent is not an Execution Log.

Intent is the identity of one business intention across retries, replays and execution attempts.

Intent is the basis for idempotency.

## Purpose

Intent answers:

```txt
Which exact business intention is being executed?
```

Intent does not answer:

```txt
How is it executed?
Who executes it?
Where did it come from?
Which Aggregate is affected?
How many attempts were made?
```

## Responsibilities

Intent is responsible only for carrying:

- deterministic intent id
- canonical business key

Intent is identity, not execution.

## Public API

```ts
export interface Intent {
  readonly id: string;

  readonly key: string;
}

export interface IntentDescriptor {
  readonly namespace: string;

  readonly action: string;

  readonly version: number;

  readonly components: Readonly<Record<string, string>>;
}

export interface IntentFactory {
  create(descriptor: IntentDescriptor): Intent;
}
```

## Fields

### id

`id` is the deterministic identifier of the Intent.

It is derived from the canonical Intent key.

It is represented as a deterministic UUIDv5.

It is used as the idempotency key.

The same business intention must always produce the same `id`.

Different business intentions must always produce different `id` values.

The UUID generation algorithm is an implementation detail.

### key

`key` is the canonical business identity used to derive `id`.

It exists for readability, debugging, logging and traceability.

Examples:

```txt
profile:activate:v1:profileId=profile-42&tenantId=tenant-1

wallet:create:v1:currency=EUR&tenantId=tenant-1&userId=user-1

withdrawal:approve:v1:approvalStep=1&tenantId=tenant-1&withdrawalId=wd-42

payment:deposit-create:v1:paymentId=pay-42&tenantId=tenant-1

webhook:process:v1:externalEventId=evt-42&provider=stripe
```

Intent keys are:

- canonical
- deterministic
- versionable
- unambiguous

Intent keys must not contain:

- passwords
- access tokens
- secrets
- personally identifiable information (PII)

Instead, stable business identifiers or public identifiers should be used.

## Intent Descriptor

Intent is created from an `IntentDescriptor`.

The descriptor defines:

- namespace
- action
- semantic version
- business identity components

The Intent Factory converts the descriptor into a canonical key and generates the deterministic UUID.

## Determinism

Intent generation must not depend on:

- random values
- current time
- process memory
- retry attempt number
- transport metadata
- message metadata
- message offset
- request id

Intent generation must depend only on the canonical Intent Descriptor.

## Ownership

Intent is created before an Operation.

Intent Factory creates Intent from an IntentDescriptor.

Intent becomes part of an Operation.

Intent remains immutable during the entire execution lifecycle.

Intent may be created by:

- Use Cases
- Transport adapters
- Message consumers
- Webhook handlers
- Cron jobs

Runner must not modify Intent.

Command Handlers must not modify Intent.

Operations must not modify Intent.

## Intent vs Operation

Intent identifies the business intention.

Operation describes the domain action executed under that Intent.

Example:

```txt
Intent:
profile:activate:v1:profileId=profile-42&tenantId=tenant-1

Operation:
ActivateProfile
```

## Intent vs Command

Intent is business identity.

Command transports an Operation through the execution pipeline.

Command may contain execution options.

Intent must never contain execution options.

## Forbidden

Intent must not contain:

- actor
- correlation
- aggregate identifier
- aggregate data
- operation payload
- retry options
- timeout options
- rate limit options
- execution metadata
- transport metadata
- message metadata
- execution attempt number
- outbox metadata
- cache metadata

Intent must not:

- execute logic
- replace Operation
- replace Command
- replace Execution Log

## Design Rules

Intent should be:

- deterministic
- immutable
- stable
- canonical
- reproducible
- explainable
- versionable
- derived from business identifiers
- safe to persist
- safe to log

## Core Principle

Intent is only:

```txt
Deterministic identity of exactly one business intention.

It is the basis for idempotency.
```
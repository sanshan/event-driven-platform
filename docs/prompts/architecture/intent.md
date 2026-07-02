# Intent

Intent represents a deterministic business intention.

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
Where did it come from?
How many attempts were made?
```

## Responsibilities

Intent is responsible for carrying:

* deterministic intent id
* explainable business key
* correlation id

Intent is identity, not execution.

## Abstract Interface

```ts
export interface IIntent {
  readonly id: IntentId;

  readonly key: IntentKey;

  readonly correlationId: CorrelationId;
}
```

## Fields

### id

`id` is the deterministic identifier of the Intent.

It must be derived from stable business inputs.

It must be used as the idempotency key.

The same business intention must always produce the same `id`.

Different business intentions must produce different `id` values.

### key

`key` is the explainable business key used to derive `id`.

It exists for readability, debugging, logs and traceability.

Examples:

```txt
register-user:{tenantId}:{email}
approve-withdrawal:{tenantId}:{withdrawalId}:{approvalStep}
lock-user:{tenantId}:{userId}:{reason}
create-deposit:{tenantId}:{paymentId}
process-webhook:{provider}:{externalEventId}
```

The exact key format is defined by the domain or application scenario.

### correlationId

`correlationId` connects multiple intents within the same trace or workflow.

The same `correlationId` may include many intents.

The same `intentId` must represent only one business intention.

## Determinism

Intent generation must not depend on:

* random values
* current time
* process memory
* retry attempt number
* transport-specific metadata
* message offset
* request id

Intent generation must depend only on stable business inputs.

## Ownership

Intent is created before Operation execution.

Intent travels with Operation.

Intent must remain unchanged during the entire execution lifecycle.

Use Case may create Intent.

Transport adapters may create Intent.

Message consumers may create Intent.

Webhook handlers may create Intent.

Cron jobs may create Intent.

Runner must not modify Intent.

Command Handler must not modify Intent.

Operation must not modify Intent.

## Intent vs Operation

Intent identifies the business intention.

Operation describes the domain action over an Aggregate.

Example:

```txt
Intent:
profile.activate:{tenantId}:{profileId}:by-platform

Operation:
ActivateProfile
```

## Intent vs Command

Intent is business identity.

Command transports Operation through the execution pipeline.

Command may contain execution options.

Intent must not contain execution options.

## Intent vs Correlation

Intent is used for idempotency.

Correlation is used for tracing.

Example:

```txt
correlationId = register-user-flow-123

intent 1 = create-user:{tenantId}:{email}
intent 2 = create-profile:{tenantId}:{userId}
intent 3 = create-wallet:{tenantId}:{userId}:{currency}
```

## Forbidden

Intent must not contain:

* retry options
* timeout options
* rate limit options
* transport metadata
* message metadata
* execution attempt number
* outbox metadata
* cache metadata
* Operation payload
* Actor
* Aggregate data

Intent must not:

* execute logic
* replace Operation
* replace Command
* replace Execution Log

## Design Rules

Intent should be:

* deterministic
* stable
* explainable
* traceable
* derived from business identifiers
* safe to persist
* safe to log

## Core Principle

Intent is only:

```txt
Deterministic identity of one business intention.
```

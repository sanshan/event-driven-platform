# OperationResult

OperationResult represents a business outcome produced by an Operation execution.

OperationResult is returned by an OperationHandler.

OperationResult describes:

```txt
What business outcome was produced?
What business data was produced?
Should transactional changes be preserved or discarded?
Which Events were produced?
```

OperationResult does not represent infrastructure execution failures.

## Purpose

OperationResult provides a typed representation of an Operation outcome.

OperationResult distinguishes between:

* successful execution
* rejection with preserved changes
* rejection with discarded changes

Each outcome may define its own:

* business data
* rejection reason
* Event types

## Result variants

OperationResult has three variants:

```txt
success
committed rejection
rolled-back rejection
```

The variants form a discriminated union.

## SuccessfulOperationResult

SuccessfulOperationResult means that the Operation completed successfully.

Changes produced by the Operation must be preserved.

```ts
export interface SuccessfulOperationResult<
    TData = void,
    TEvent = never,
> {
    readonly status: 'success';

    readonly data: TData;
    readonly events: readonly TEvent[];
}
```

### Data

`data` contains the business data produced by successful execution.

Examples:

```txt
created entity identifier
updated balance
calculated business value
void
```

### Events

A successful result may contain Events.

When no Events are produced, `events` is an empty collection.

## CommittedOperationRejection

CommittedOperationRejection means that the Operation was rejected as a business outcome, but changes produced during its execution must be preserved.

```ts
export interface CommittedOperationRejection<
    TReason,
    TData = void,
    TEvent = never,
> {
    readonly status: 'rejected';
    readonly completion: 'committed';

    readonly reason: TReason;
    readonly data: TData;
    readonly events: readonly TEvent[];
}
```

### Reason

`reason` describes why the Operation was rejected.

It may be a structured business value.

```ts
export interface WalletAlreadyExistsReason {
    readonly code: 'wallet-already-exists';
}
```

### Data

`data` contains business data produced while processing the rejected Operation.

The data type is specific to the concrete rejection.

### Events

A committed rejection may contain Events.

When no Events are produced, `events` is an empty collection.

## RolledBackOperationRejection

RolledBackOperationRejection means that the Operation was rejected and changes produced during execution must be discarded.

```ts
export interface RolledBackOperationRejection<
    TReason,
    TData = void,
> {
    readonly status: 'rejected';
    readonly completion: 'rolled-back';

    readonly reason: TReason;
    readonly data: TData;
    readonly events: readonly [];
}
```

### Reason

`reason` describes why the Operation was rejected.

### Data

`data` contains business data produced while evaluating the Operation.

The data remains part of the result even though transactional changes are discarded.

Example:

```ts
export interface InsufficientBalanceData {
    readonly available: Money;
    readonly requested: Money;
}
```

### Events

A rolled-back rejection must not contain Events.

Its `events` field is always an empty tuple.

## OperationResult union

OperationResult is the union of all supported result variants.

```ts
export type OperationResult =
    | SuccessfulOperationResult<unknown, unknown>
    | CommittedOperationRejection<unknown, unknown, unknown>
    | RolledBackOperationRejection<unknown, unknown>;
```

The base OperationResult type identifies the common family of Operation outcomes.

Concrete Operations should define precise result unions.

## Concrete result unions

A concrete Operation should compose its result from the exact variants it may produce.

```ts
export type ChangeBalanceResult =
    | SuccessfulOperationResult<
          ChangeBalanceSuccessData,
          BalanceChangedEvent
      >
    | BalanceLimitCommittedRejection
    | InsufficientBalanceRolledBackRejection
    | AccountBlockedRolledBackRejection;
```

Different result variants may contain different data types.

Different rejection reasons may also define different data types.

Example:

```ts
export type InsufficientBalanceRolledBackRejection =
    RolledBackOperationRejection<
        {
            readonly code: 'insufficient-balance';
        },
        {
            readonly available: Money;
            readonly requested: Money;
        }
    >;
```

```ts
export type AccountBlockedRolledBackRejection =
    RolledBackOperationRejection<
        {
            readonly code: 'account-blocked';
        },
        {
            readonly blockedAt: Date;
        }
    >;
```

This preserves exact type narrowing for every business outcome.

## Business rejection

A rejection is an expected business outcome.

Examples:

```txt
insufficient balance
wallet already exists
account is blocked
operation is unavailable in the current state
business limit exceeded
```

Expected business rejection must be represented as an OperationResult variant.

It must not be represented as an exception.

## Infrastructure failures

OperationResult must not represent unexpected execution or infrastructure failures.

The following are outside OperationResult:

* transaction failure
* storage failure
* timeout
* retry exhaustion
* handler resolution failure
* unexpected exception
* unavailable infrastructure dependency

## Type discrimination

OperationResult variants must be distinguishable through their discriminant fields.

```ts
if (result.status === 'success') {
    result.data;
    result.events;
}
```

```ts
if (
    result.status === 'rejected' &&
    result.completion === 'committed'
) {
    result.reason;
    result.data;
    result.events;
}
```

```ts
if (
    result.status === 'rejected' &&
    result.completion === 'rolled-back'
) {
    result.reason;
    result.data;
    result.events;
}
```

Concrete rejection unions should use discriminated `reason` types when multiple rejection reasons are possible.

```ts
if (
    result.status === 'rejected' &&
    result.reason.code === 'insufficient-balance'
) {
    result.data.available;
    result.data.requested;
}
```

## Type guards

The OperationResult package should provide type guards for common result categories.

```ts
isSuccessfulOperationResult(result)
isOperationRejection(result)
isCommittedOperationRejection(result)
isRolledBackOperationRejection(result)
```

Type guards narrow only the result category.

Concrete business reason narrowing remains the responsibility of the concrete result union.

## Creation

OperationResult variants should be created through public factory functions.

```ts
OperationResult.success({
    data,
    events,
});
```

```ts
OperationResult.committedRejection({
    reason,
    data,
    events,
});
```

```ts
OperationResult.rolledBackRejection({
    reason,
    data,
});
```

Factories must:

* set discriminant fields
* create an empty Event collection when Events are omitted
* prevent Events from being supplied to rolled-back rejection
* preserve inferred data, reason and Event types

## Design rules

OperationResult must:

* represent only business outcomes
* use a discriminated union
* distinguish success from rejection
* distinguish committed rejection from rolled-back rejection
* allow each result variant to define its own data type
* allow each rejection reason to define its own data type
* support structured rejection reasons
* support `void` data
* allow Events only for outcomes whose changes are preserved
* prohibit Events for rolled-back rejection
* remain independent from execution infrastructure

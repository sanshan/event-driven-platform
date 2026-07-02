# Consistency Options

ConsistencyOptions describe consistency requirements for Command execution.

ConsistencyOptions are declarative.

ConsistencyOptions do not enforce consistency by themselves.

ConsistencyOptions are carried by CommandOptions and interpreted by the Runner.

## Purpose

ConsistencyOptions answer:

```txt
Which consistency guarantees are required for this Command execution?
```

ConsistencyOptions do not answer:

```txt
What domain state transition should happen?
```

That is the responsibility of domain logic.

## Responsibilities

ConsistencyOptions are responsible for carrying:

* consistency level
* transactional requirement
* read-after-write requirement
* isolation requirement

ConsistencyOptions do not implement consistency behavior.

## Abstract Interface

```ts
export interface ConsistencyOptions {
  readonly level: ConsistencyLevel;

  readonly transaction?: TransactionRequirement;

  readonly readAfterWrite?: ReadAfterWriteRequirement;

  readonly isolation?: IsolationRequirement;
}

export type ConsistencyLevel =
  | 'default'
  | 'strong'
  | 'eventual';

export type TransactionRequirement =
  | 'required'
  | 'not-required';

export type ReadAfterWriteRequirement =
  | 'required'
  | 'not-required';

export type IsolationRequirement =
  | 'default'
  | 'read-committed'
  | 'repeatable-read'
  | 'serializable';
```

## Consistency Level Rule

`level` declares the expected consistency level.

```txt
default:
  use system default behavior

strong:
  require strong execution consistency

eventual:
  allow eventual consistency where supported
```

The Runner interprets the selected level.

## Transaction Rule

`transaction` declares whether execution requires a transaction.

```txt
required:
  execute mutation inside transaction

not-required:
  transaction is not required
```

ConsistencyOptions do not open transactions.

The Runner controls transaction boundaries.

## Read-After-Write Rule

`readAfterWrite` declares whether immediate read consistency is required after execution.

ConsistencyOptions do not perform reads.

ConsistencyOptions do not update caches.

The Runner or Reader pipeline interprets read-after-write requirements where applicable.

## Isolation Rule

`isolation` declares required transaction isolation.

ConsistencyOptions do not enforce database isolation.

The Runner maps isolation requirements to infrastructure capabilities.

## Allowed

ConsistencyOptions may contain:

* consistency level
* transaction requirement
* read-after-write requirement
* isolation requirement

## Forbidden

ConsistencyOptions must not:

* open transactions
* commit transactions
* rollback transactions
* enforce database isolation directly
* read from databases
* write to databases
* update caches
* invalidate caches
* execute Commands
* execute Operations
* contain domain rules
* validate domain invariants
* mutate Aggregates
* write execution logs
* write outbox records
* publish messages

## Core Principle

ConsistencyOptions are only:

```txt
Declarative consistency requirements.
```

ConsistencyOptions are not:

```txt
Transaction manager.
Database isolation implementation.
Cache invalidation mechanism.
Read model updater.
Domain rule.
Execution engine.
Infrastructure adapter.
```

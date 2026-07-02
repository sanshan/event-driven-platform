# Guard Options

GuardOptions describe which execution guards must be evaluated before or during Command execution.

GuardOptions are declarative.

GuardOptions do not evaluate guards by themselves.

GuardOptions are carried by CommandOptions and interpreted by the Runner.

## Purpose

GuardOptions answer:

```txt
Which execution guards should be evaluated for this Command?
```

GuardOptions do not answer:

```txt
Is the Aggregate state valid?
```

That is a domain invariant concern.

## Responsibilities

GuardOptions are responsible for carrying:

* guard name
* guard parameters
* guard phase
* rejection behavior

GuardOptions do not implement guard behavior.

## Abstract Interface

```ts
export interface GuardOptions {
  readonly name: string;

  readonly phase?: GuardPhase;

  readonly params?: Record<string, unknown>;

  readonly rejectWith?: GuardRejection;
}

export type GuardPhase =
  | 'before-execution'
  | 'after-execution';

export interface GuardRejection {
  readonly reason: string;

  readonly code?: string;
}
```

## Name Rule

`name` identifies the guard to evaluate.

The name must be stable.

The name must be known by the Runner guard registry.

Examples:

```txt
tenant-active
actor-not-blocked
feature-enabled
maintenance-window-closed
```

## Parameters Rule

`params` provide guard-specific configuration.

Parameters must be serializable.

Parameters must not contain Aggregate instances.

Parameters must not contain infrastructure clients.

## Phase Rule

`phase` declares when the guard should be evaluated.

```txt
before-execution:
  evaluated before Command Handler execution

after-execution:
  evaluated after Command Handler execution
```

If omitted, the default phase is `before-execution`.

## Domain Boundary Rule

Guards are execution-level checks.

Guards must not replace domain invariants.

Examples of valid guards:

```txt
tenant is active
feature is enabled
actor is not blocked
system is not in maintenance mode
```

Examples of invalid guards:

```txt
withdrawal amount is allowed by Aggregate state
profile can be activated from current Profile status
wallet can be closed with current balance
```

Those decisions belong to domain logic.

## Rejection Rule

`rejectWith` declares rejection metadata.

The Runner produces the rejection Result when guard evaluation fails.

GuardOptions do not reject execution by themselves.

## Allowed

GuardOptions may contain:

* guard name
* guard phase
* guard parameters
* rejection metadata

## Forbidden

GuardOptions must not:

* evaluate guards
* access databases
* access caches
* access messaging infrastructure
* contain domain invariants
* mutate Aggregates
* load Aggregates
* save Aggregates
* execute Commands
* execute Operations
* publish messages
* write execution logs
* write outbox records

## Core Principle

GuardOptions are only:

```txt
Declarative guard requirements.
```

GuardOptions are not:

```txt
Guard implementation.
Domain invariant.
Authorization engine.
Policy engine.
Execution engine.
Infrastructure adapter.
```

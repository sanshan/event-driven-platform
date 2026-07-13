# Guard Options

GuardOptions describe which execution Guards must be evaluated before Command execution.

GuardOptions are declarative.

GuardOptions do not evaluate Guards.

GuardOptions are carried by CommandOptions and interpreted by the Runner.

## Purpose

GuardOptions answer:

```txt
Which Guards must pass before this Command may be executed?
```

GuardOptions do not answer:

```txt
Is the Aggregate state valid?
Why did a Guard fail?
```

Those concerns belong to domain logic and Guard implementations.

## Responsibilities

GuardOptions are responsible only for carrying:

- guard name
- guard parameters

GuardOptions do not implement Guard behavior.

## Abstract Interface

```ts
export interface GuardOptions {
    readonly name: string;

    readonly params?: Readonly<Record<string, unknown>>;
}
```

## Name Rule

`name` identifies the Guard to evaluate.

The name must be stable.

The name must be known by the Runner Guard registry.

Examples:

```txt
tenant-active
actor-not-blocked
feature-enabled
maintenance-window-closed
```

## Parameters Rule

`params` provide Guard-specific configuration.

Parameters must be serializable.

Parameters must not contain:

- Aggregate instances
- infrastructure clients
- executable functions

## Execution Rule

All declared Guards are evaluated before Operation execution.

The evaluation order and execution strategy are determined by the Runner.

GuardOptions do not control Guard execution.

## Domain Boundary Rule

Guards are execution-level checks.

Guards must not replace domain invariants.

Valid Guards:

```txt
tenant is active
feature is enabled
actor is not blocked
system is not in maintenance mode
```

Invalid Guards:

```txt
profile can be activated from its current state
wallet can be closed with its current balance
```

Those decisions belong to domain logic.

## Allowed

GuardOptions may contain:

- Guard name
- Guard parameters

## Forbidden

GuardOptions must not:

- evaluate Guards
- contain domain rules
- mutate Aggregates
- execute Operations
- execute Commands
- access infrastructure
- publish messages
- write execution logs

## Core Principle

GuardOptions are only:

```txt
Declarative Guard requirements.
```

GuardOptions are not:

```txt
Guard implementation.
Domain invariant.
Execution engine.
Infrastructure adapter.
```

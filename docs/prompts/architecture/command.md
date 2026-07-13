# Command

A Command is an execution envelope for an Operation.

Command transports an Operation through the execution pipeline.

Command is colocated with Operations inside the corresponding domain module, but Command is not a domain model.

Command contains no business logic.

Command does not execute anything by itself.

## Purpose

A Command answers:

```txt
How should this Operation be executed?
```

Operation answers:

```txt
What domain action should happen?
```

Command wraps an Operation together with its execution requirements.

## Responsibilities

A Command is responsible for carrying:

- Operation
- CommandOptions

Command does not interpret execution requirements.

Command does not execute execution requirements.

## Abstract Interface

```ts
export interface Command<TOperation extends Operation<unknown, unknown>> {
    readonly operation: TOperation;

    readonly options?: CommandOptions;
}
```

## Command vs Operation

Operation describes the domain action.

Command describes how that Operation should be executed.

Example:

```txt
Operation:
  ActivateProfile

Command:
  Execute ActivateProfile
  with specific execution requirements
```

## Idempotency Rule

Command does not define idempotency.

Idempotency is based on the Operation Intent.

Command transports the Operation that carries the deterministic Intent.

## Allowed

A Command may contain:

- Operation
- CommandOptions

## Forbidden

A Command must not:

- contain business logic
- contain domain rules
- validate domain invariants
- mutate Aggregates
- execute Operations
- call other Commands
- call Use Cases
- publish messages
- write execution logs
- write outbox records
- access infrastructure

## Architecture Rule

Commands are colocated with the corresponding Operations.

Example:

```txt
domain/profile/commands/
domain/profile/operations/

domain/wallet/commands/
domain/wallet/operations/
```

Command is not a domain model.

Command is an execution envelope.

## Core Principle

Command is only:

```txt
An execution envelope around an Operation.
```

Command is not:

```txt
Business intent.
Domain action.
Domain model.
Workflow.
Handler.
Execution engine.
Infrastructure adapter.
```

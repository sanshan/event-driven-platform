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

Command does not replace Operation.

Command wraps Operation with execution requirements.

## Responsibilities

Command is responsible for carrying:

* operation
* execution options
* retry options
* timeout options
* rate limit options
* guard options
* consistency options
* metadata required for execution

Command only declares execution requirements.

Command does not interpret execution requirements.

Command does not execute execution requirements.

## Abstract Interface

```ts
export interface ICommand<
  TOperation extends IOperation<unknown, unknown>
> {
  readonly operation: TOperation;

  readonly options?: CommandOptions;
}

export interface CommandOptions {
  readonly timeoutMs?: number;

  readonly retry?: RetryOptions;

  readonly rateLimit?: RateLimitOptions;

  readonly guards?: GuardOptions[];

  readonly consistency?: ConsistencyOptions;

  readonly executionMode?: ExecutionMode;
}
```

## Command Options Rule

CommandOptions are declared by the Use Case.

CommandOptions are executed by the Runner.

Command must not implement CommandOptions.

Command must not interpret CommandOptions.

Examples:

```txt
retry:
  declared in Command
  executed by Runner

timeout:
  declared in Command
  executed by Runner

rateLimit:
  declared in Command
  executed by Runner

guards:
  declared in Command
  evaluated by Runner
```

## Command vs Operation

Operation describes the domain action.

Command describes execution requirements for that Operation.

Example:

```txt
Operation:
  ActivateProfile

Command:
  Execute ActivateProfile
  with timeout = 3000ms
  with retry = 3 attempts
  with rate limit = profile-activation
```

## Idempotency Rule

Command does not define idempotency.

Idempotency is based on Operation intent.

Command only transports the Operation that contains the deterministic intent.

Commands with the same Operation intent represent the same business intention.

## Allowed

A Command may contain:

* Operation
* retry configuration
* timeout configuration
* rate limit configuration
* guard configuration
* consistency configuration
* execution mode
* technical metadata required for execution

## Forbidden

A Command must not:

* contain business logic
* contain domain rules
* validate domain invariants
* mutate Aggregates
* load Aggregates
* save Aggregates
* execute Operations directly
* call other Commands
* call Use Cases
* publish messages
* write execution logs
* write outbox records
* implement retries
* implement idempotency
* implement rate limiting
* evaluate guards
* access databases directly
* access Kafka directly
* access Redpanda directly
* access Redis directly

## Architecture Rule

Commands are located inside the domain module of the corresponding business capability.

Example:

```txt
domain/profile/commands/
domain/wallet/commands/
domain/withdrawal/commands/
```

Operations are located separately:

```txt
domain/profile/operations/
domain/wallet/operations/
domain/withdrawal/operations/
```

Commands are colocated with Operations because each Command wraps a domain Operation.

However, Command is not a domain model.

Command does not contain domain rules.

Command does not mutate Aggregates.

Command does not represent Aggregate state.

Command is a transport envelope for executing an Operation through Runner.

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
Persistence.
Messaging.
Retry implementation.
Idempotency implementation.
Rate limiter.
Guard evaluator.
Execution log.
Outbox writer.
```

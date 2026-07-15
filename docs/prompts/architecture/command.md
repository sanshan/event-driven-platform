# Command

Command represents a request to execute an Operation.

Command is the write-side execution envelope.

Command transports an Operation together with execution context and execution options.

Command contains no business logic.

Command does not execute anything by itself.

## Purpose

Command answers:

```txt
Under which execution context and requirements should this Operation be executed?
```

Operation answers:

```txt
What domain action should happen?
```

## Responsibilities

Command is responsible only for carrying:

* Operation
* CommandContext
* CommandOptions

Command does not interpret or execute the carried requirements.

## Public API

```ts
export interface Command<
  TOperation extends Operation<string, unknown, unknown, unknown>,
> {
  readonly operation: TOperation;

  readonly context: CommandContext;

  readonly options?: CommandOptions;
}
```

## CommandContext

CommandContext carries metadata associated with a particular execution flow.

Initial public API:

```ts
export interface CommandContext {
  readonly correlationId: string;
}
```

CommandContext must contain only execution context currently required by the system.

Additional fields must not be added speculatively.

## Correlation

Every Command carries a correlation identifier through CommandContext.

The correlation identifier associates the Command execution with the wider execution flow that caused it.

Correlation metadata belongs to Command rather than Operation because it describes execution context, not domain intent.

The same Operation may be transported by different Commands with different correlation identifiers.

## CommandOptions

CommandOptions describes execution requirements for the Operation.

CommandOptions may contain:

* retry options
* timeout options
* rate limit options
* guard options
* consistency options

Command carries these options but does not interpret or execute them.

## Command vs Operation

Operation describes the domain action.

Command transports the Operation through the execution pipeline.

Example:

```txt
Operation:
  ActivateProfile

Command:
  Execute ActivateProfile
  within a specific execution context
  using specific execution requirements
```

## Result type

Command does not independently define the result type.

Command preserves the result contract defined by its Operation.

The result type must not be supplied independently by the Command creator.

## Idempotency

Command does not define or implement idempotency.

Command transports the Operation that carries Intent.

## Allowed

Command may contain:

* Operation
* CommandContext
* CommandOptions

## Forbidden

Command must not:

* contain business logic
* contain domain rules
* define business intent
* validate domain invariants
* mutate Aggregates
* execute Operations
* call other Commands
* call Use Cases
* publish messages
* write execution logs
* write outbox records
* access infrastructure
* independently define the Operation result type

## Location

Commands are colocated with the corresponding Operations inside the domain module.

Example:

```txt
domain/profile/commands/
domain/profile/operations/

domain/wallet/commands/
domain/wallet/operations/
```

Colocation does not make Command a domain model.

Command remains an execution envelope.

## Design rules

Commands must:

* be immutable
* be serializable
* contain no business logic
* preserve the concrete Operation type
* preserve the Operation result contract
* keep execution context separate from domain intent
* keep execution options separate from business payload

## Core principle

Command is only:

```txt
An execution envelope around an Operation.
```

Its structure is:

```txt
Command
├── Operation
├── CommandContext
└── CommandOptions
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

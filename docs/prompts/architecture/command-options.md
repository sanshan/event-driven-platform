# Command Options

CommandOptions describe execution requirements for a Command.

CommandOptions are declarative.

CommandOptions do not execute anything by themselves.

CommandOptions are defined by the Use Case and interpreted by the Runner.

## Purpose

CommandOptions answer:

```txt
With which execution requirements should this Command be executed?
```

CommandOptions do not answer:

```txt
What domain action should happen?
```

That is the responsibility of Operation.

## Responsibilities

CommandOptions are responsible for carrying:

* timeout requirements
* retry requirements
* rate limit requirements
* guard requirements
* consistency requirements
* execution mode
* execution metadata

CommandOptions do not implement execution behavior.

## Abstract Interface

```ts
export interface CommandOptions {
  readonly timeoutMs?: number;

  readonly retry?: RetryOptions;

  readonly rateLimit?: RateLimitOptions;

  readonly guards?: GuardOptions[];

  readonly consistency?: ConsistencyOptions;

  readonly executionMode?: ExecutionMode;

  readonly metadata?: CommandExecutionMetadata;
}
```

## Retry Options

RetryOptions declare retry requirements.

```ts
export interface RetryOptions {
  readonly maxAttempts: number;

  readonly strategy: RetryStrategy;

  readonly delayMs?: number;

  readonly maxDelayMs?: number;
}

export type RetryStrategy =
  | 'none'
  | 'fixed'
  | 'exponential';
```

RetryOptions do not retry execution.

Retry behavior is performed by the Runner.

## Timeout Options

Timeout is declared as `timeoutMs`.

```ts
export interface CommandOptions {
  readonly timeoutMs?: number;
}
```

Timeout does not cancel execution by itself.

Timeout behavior is controlled by the Runner.

## Rate Limit Options

RateLimitOptions declare rate limit requirements.

```ts
export interface RateLimitOptions {
  readonly key: string;

  readonly scope?: RateLimitScope;

  readonly limit?: number;

  readonly windowMs?: number;
}

export type RateLimitScope =
  | 'actor'
  | 'tenant'
  | 'subject'
  | 'operation'
  | 'global';
```

RateLimitOptions do not perform rate limiting.

Rate limiting is performed by the Runner.

## Guard Options

GuardOptions declare which execution guards must be evaluated.

```ts
export interface GuardOptions {
  readonly name: string;

  readonly params?: Record<string, unknown>;
}
```

GuardOptions do not evaluate guards.

Guard evaluation is performed by the Runner.

Guard definitions are described in a separate architecture document.

## Consistency Options

ConsistencyOptions declare execution consistency requirements.

```ts
export interface ConsistencyOptions {
  readonly level: ConsistencyLevel;
}

export type ConsistencyLevel =
  | 'default'
  | 'strong'
  | 'eventual';
```

ConsistencyOptions do not enforce consistency by themselves.

Consistency behavior is interpreted by the Runner.

## Execution Mode

ExecutionMode declares how the Command should participate in execution flow.

```ts
export type ExecutionMode =
  | 'sync'
  | 'async'
  | 'fire-and-forget';
```

ExecutionMode does not execute the Command.

ExecutionMode is interpreted by the Runner.

## Execution Metadata

CommandExecutionMetadata carries technical execution metadata.

```ts
export interface CommandExecutionMetadata {
  readonly source?: string;

  readonly priority?: CommandPriority;

  readonly tags?: readonly string[];
}

export type CommandPriority =
  | 'low'
  | 'normal'
  | 'high';
```

Metadata must not contain business rules.

Metadata must not contain domain state.

## Allowed

CommandOptions may contain:

* retry configuration
* timeout configuration
* rate limit configuration
* guard configuration
* consistency configuration
* execution mode
* execution metadata

## Forbidden

CommandOptions must not:

* contain business logic
* contain domain rules
* validate domain invariants
* mutate Aggregates
* load Aggregates
* save Aggregates
* execute Commands
* execute Operations
* evaluate guards
* perform retries
* perform rate limiting
* enforce consistency directly
* write execution logs
* write outbox records
* publish messages
* access databases
* access caches
* access messaging infrastructure

## Ownership Rule

CommandOptions are declared by the Use Case.

CommandOptions are carried by the Command.

CommandOptions are interpreted by the Runner.

```txt
Use Case
  -> declares CommandOptions

Command
  -> carries CommandOptions

Runner
  -> interprets CommandOptions
```

## Core Principle

CommandOptions are only:

```txt
Declarative execution requirements.
```

CommandOptions are not:

```txt
Business rules.
Domain rules.
Execution implementation.
Retry implementation.
Rate limiter.
Guard evaluator.
Consistency engine.
Infrastructure access.
```

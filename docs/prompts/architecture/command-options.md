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

That is the responsibility of the Operation.

## Responsibilities

CommandOptions are responsible for carrying:

- timeout requirements
- retry requirements
- rate limit requirements
- Guard requirements

CommandOptions do not implement execution behavior.

## Abstract Interface

```ts
export interface CommandOptions {
    readonly timeoutMs?: number;

    readonly retry?: RetryOptions;

    readonly rateLimit?: RateLimitOptions;

    readonly guards?: readonly GuardOptions[];
}
```

Each option is described by its own architecture document.

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

## Allowed

CommandOptions may contain:

- timeout configuration
- retry configuration
- rate limit configuration
- Guard configuration

## Forbidden

CommandOptions must not:

- contain business logic
- contain domain rules
- validate domain invariants
- execute Commands
- execute Operations
- perform retries
- perform rate limiting
- evaluate Guards
- access infrastructure
- publish messages
- write execution logs
- write outbox records

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
Infrastructure adapter.
```

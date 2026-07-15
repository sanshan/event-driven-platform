# CommandOptions

CommandOptions represent declarative requirements for Operation execution.

CommandOptions describe how an Operation should be executed.

CommandOptions contain no execution behavior.

## Purpose

CommandOptions answer:

```txt
With which execution requirements should the Operation be executed?
```

CommandOptions do not describe the domain action itself.

## Responsibilities

CommandOptions are responsible only for carrying execution requirements.

CommandOptions may carry:

* timeout requirements
* retry requirements
* rate limit requirements
* guard requirements
* consistency requirements

## Public API

```ts
export interface CommandOptions {
  readonly timeoutMs?: number;

  readonly retry?: RetryOptions;

  readonly rateLimit?: RateLimitOptions;

  readonly guards?: readonly GuardOptions[];

  readonly consistency?: ConsistencyOptions;
}
```

Each option type defines its own declarative contract.

## Declarative nature

CommandOptions describe requested execution behavior.

They do not implement that behavior.

For example:

```text
{
  timeoutMs: 5_000,
  retry: {
    attempts: 3,
  },
}
```

This describes execution requirements.

It does not start a timeout or perform a retry.

## Creation

CommandOptions are defined by the component that creates the Command.

A Command may be created by:

* a Use Case
* a transport adapter
* a consumer
* a scheduled job
* a webhook handler

The creator may omit CommandOptions when no explicit execution requirements are needed.

## Optionality

CommandOptions and all of their fields are optional.

Absence of an option means that no explicit requirement of that type was provided by the Command.

Default execution behavior is not defined by CommandOptions.

## Allowed

CommandOptions may contain only declarative execution requirements.

## Forbidden

CommandOptions must not:

* contain business logic
* contain domain rules
* validate domain invariants
* execute Commands
* execute Operations
* perform retries
* enforce timeouts
* perform rate limiting
* evaluate guards
* manage consistency
* access infrastructure
* publish messages
* write execution logs
* write outbox records

## Design rules

CommandOptions must:

* be immutable
* be serializable
* remain declarative
* contain no execution implementation
* contain no business payload
* contain only execution requirements

## Core principle

CommandOptions are only:

```txt
Declarative requirements for Operation execution.
```

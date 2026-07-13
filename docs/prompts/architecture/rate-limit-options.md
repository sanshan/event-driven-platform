# Rate Limit Options

RateLimitOptions describe rate limiting requirements for Command execution.

RateLimitOptions are declarative.

RateLimitOptions do not perform rate limiting by themselves.

RateLimitOptions are carried by CommandOptions and interpreted by the Runner.

## Purpose

RateLimitOptions answer:

```txt
How should execution of this Command be rate-limited?
```

RateLimitOptions do not answer:

```txt
Is the domain action valid?
```

That is not a rate limiting concern.

## Responsibilities

RateLimitOptions are responsible for carrying:

- rate limit key
- rate limit scope
- limit value
- time window
- cost
- rejection behavior

RateLimitOptions do not implement rate limiting behavior.

## Abstract Interface

```ts
export interface RateLimitOptions {
    readonly key: string;

    readonly scope: RateLimitScope;

    readonly limit: number;

    readonly windowMs: number;

    readonly cost?: number;

    readonly rejectWith?: RateLimitRejection;
}

export type RateLimitScope = 'actor' | 'tenant' | 'subject' | 'operation' | 'global';

export interface RateLimitRejection {
    readonly reason: string;

    readonly retryAfterMs?: number;
}
```

## Key Rule

`key` identifies the rate limit bucket.

The key must be deterministic.

The key must not contain unstable values.

Prefer:

```txt
profile-activation
withdrawal-approval
wallet-creation
```

Avoid:

```txt
random UUID
current timestamp
request ID
```

## Scope Rule

`scope` defines how the rate limit bucket is applied.

```txt
actor:
  limit per actor

tenant:
  limit per tenant

subject:
  limit per subject

operation:
  limit per Operation name

global:
  limit globally
```

The Runner resolves the final rate limit key using Command, Operation, Actor, Subject, and Scope.

## Cost Rule

`cost` defines how much capacity this Command consumes.

If omitted, the default cost is `1`.

RateLimitOptions do not calculate remaining capacity.

RateLimitOptions do not store counters.

## Rejection Rule

`rejectWith` declares rejection metadata.

The Runner decides whether execution is rejected due to rate limiting.

RateLimitOptions do not reject execution by themselves.

## Allowed

RateLimitOptions may contain:

- deterministic rate limit key
- rate limit scope
- limit value
- time window
- execution cost
- rejection metadata

## Forbidden

RateLimitOptions must not:

- perform rate limiting
- store counters
- read counters
- access Redis
- access databases
- access caches
- reject execution directly
- contain domain rules
- validate domain invariants
- mutate Aggregates
- execute Commands
- execute Operations
- write execution logs
- write outbox records

## Core Principle

RateLimitOptions are only:

```txt
Declarative rate limiting requirements.
```

RateLimitOptions are not:

```txt
Rate limiter.
Counter storage.
Domain rule.
Guard.
Execution engine.
Infrastructure adapter.
```

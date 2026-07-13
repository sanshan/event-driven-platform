# Retry Options

RetryOptions describe retry requirements for Command execution.

RetryOptions are declarative.

RetryOptions do not retry execution by themselves.

RetryOptions are carried by CommandOptions and interpreted by the Runner.

## Purpose

RetryOptions answer:

```txt
How may this Command be retried if execution fails?
```

RetryOptions do not answer:

```txt
Should the domain action be allowed?
```

That is not a retry concern.

## Responsibilities

RetryOptions are responsible for carrying:

- maximum retry attempts
- retry strategy
- retry delay
- maximum retry delay
- retryable error classification
- non-retryable error classification

RetryOptions do not implement retry behavior.

## Abstract Interface

```ts
export interface RetryOptions {
    readonly maxAttempts: number;

    readonly strategy: RetryStrategy;

    readonly delayMs?: number;

    readonly maxDelayMs?: number;

    readonly retryOn?: readonly RetryableErrorCode[];

    readonly doNotRetryOn?: readonly NonRetryableErrorCode[];
}

export type RetryStrategy = 'none' | 'fixed' | 'exponential';

export type RetryableErrorCode = string;

export type NonRetryableErrorCode = string;
```

## Strategy Rule

Retry strategy declares how retries should be scheduled.

```txt
none:
  no retry attempts

fixed:
  retry with fixed delay

exponential:
  retry with increasing delay
```

The Runner interprets the strategy.

RetryOptions do not calculate retry delays.

## Attempt Rule

`maxAttempts` defines the maximum number of execution attempts.

```txt
maxAttempts = 1
  means initial execution only

maxAttempts = 3
  means initial execution plus up to two retry attempts
```

The Runner must never exceed `maxAttempts`.

## Error Classification Rule

`retryOn` declares which error codes may be retried.

`doNotRetryOn` declares which error codes must not be retried.

If both match the same error, `doNotRetryOn` wins.

RetryOptions must not inspect exceptions directly.

The Runner maps execution failures to retryable or non-retryable error codes.

## Idempotency Rule

Retries must use the same Operation intent.

RetryOptions must not create a new intent.

RetryOptions must not mutate intent.

RetryOptions must not generate a new idempotency key.

## Allowed

RetryOptions may contain:

- retry strategy
- maximum attempts
- delay configuration
- maximum delay configuration
- retryable error codes
- non-retryable error codes

## Forbidden

RetryOptions must not:

- perform retries
- execute Commands
- execute Operations
- change Operation intent
- generate new intent IDs
- implement idempotency
- inspect domain state
- contain domain rules
- access databases
- access caches
- access messaging infrastructure
- write execution logs
- write outbox records

## Core Principle

RetryOptions are only:

```txt
Declarative retry requirements.
```

RetryOptions are not:

```txt
Retry implementation.
Idempotency implementation.
Domain decision.
Error handler.
Infrastructure adapter.
```

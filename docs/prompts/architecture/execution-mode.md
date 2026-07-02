# Execution Mode

ExecutionMode describes how a Command should participate in the execution flow.

ExecutionMode is declarative.

ExecutionMode does not execute anything by itself.

ExecutionMode is carried by CommandOptions and interpreted by the Runner.

## Purpose

ExecutionMode answers:

```txt
How should the caller observe Command execution?
```

ExecutionMode does not answer:

```txt
What domain action should happen?
```

That is the responsibility of Operation.

## Abstract Type

```ts
export type ExecutionMode =
  | 'sync'
  | 'async'
  | 'fire-and-forget';
```

## Sync Mode

`sync` means the caller waits for the final Result.

```txt
Use Case
  -> calls Runner
  -> waits for Result
  -> receives success or rejection outcome
```

Use `sync` when the workflow needs the execution result immediately.

## Async Mode

`async` means execution may happen asynchronously.

The caller receives an accepted execution reference instead of the final domain Result.

```txt
Use Case
  -> calls Runner
  -> receives accepted execution reference
  -> final Result is persisted later
```

Use `async` when execution may be delayed, queued, or processed outside the caller request lifecycle.

## Fire-and-Forget Mode

`fire-and-forget` means the caller does not wait for the final Result.

Execution is still tracked by Runner.

Execution log still must be written.

Outbox behavior still belongs to Runner.

```txt
Use Case
  -> calls Runner
  -> does not depend on final Result
```

Fire-and-forget must not mean untracked execution.

## Result Rule

ExecutionMode changes how the caller observes execution.

ExecutionMode must not change the Operation intent.

ExecutionMode must not change domain behavior.

ExecutionMode must not bypass execution logging.

## Idempotency Rule

All execution modes must preserve idempotency.

The same Operation intent must represent the same business intention in all modes.

## Allowed

ExecutionMode may define:

* synchronous execution
* asynchronous execution
* fire-and-forget execution
* caller observation behavior

## Forbidden

ExecutionMode must not:

* execute Commands
* execute Operations
* bypass Runner
* bypass idempotency
* bypass execution logs
* bypass result persistence
* bypass outbox persistence
* change Operation intent
* change domain behavior
* contain domain rules
* access infrastructure directly

## Core Principle

ExecutionMode is only:

```txt
A declaration of how Command execution is observed by the caller.
```

ExecutionMode is not:

```txt
Execution implementation.
Queue implementation.
Background worker.
Domain behavior.
Idempotency rule.
Logging bypass.
Outbox bypass.
```

# Execution release readiness

This document freezes the release candidate boundary and execution-policy semantics for Epic #29 before policy orchestration is implemented.

The existing `Operation -> Command -> Runner` lifecycle is the source of truth. The purpose of this document is to identify only the missing orchestration required for a safe Execution release.

## Existing lifecycle guarantees

The following behavior is already implemented and must be preserved:

- deterministic `ExecutionId` derivation from `Operation.intent.id`;
- atomic execution claiming through `ExecutionLogStore`;
- returning a previously completed `OperationResult` without executing the handler again;
- intent-conflict detection when the same intent identifies a different persisted Operation snapshot;
- active execution ownership through leases and lease versions;
- persisted execution attempts;
- exact attempt and lease fencing during completion/failure transitions;
- `OperationHandler` resolution and execution;
- committed and rolled-back domain rejection semantics;
- transactional completion plus Outbox persistence;
- rollback when completion or Outbox persistence fails;
- infrastructure failure recording that does not replace the original execution error.

Policy work must compose with these guarantees rather than replace them.

## Candidate public package boundary

The existing public core remains unchanged.

The Execution release candidate consists of the following currently-private packages because they are either directly consumed by applications or appear in the public type/runtime dependency graph of `command`, `runner`, or `createRunner()` composition:

### Command and policy contracts

- `@event-driven-platform/guard`
- `@event-driven-platform/rate-limit`
- `@event-driven-platform/retry`
- `@event-driven-platform/command`

### Execution identity and persistence contracts

- `@event-driven-platform/clock`
- `@event-driven-platform/execution`
- `@event-driven-platform/execution-log`
- `@event-driven-platform/execution-log-store`
- `@event-driven-platform/execution-transaction`

### Handler and event/outbox composition contracts

- `@event-driven-platform/operation-handler`
- `@event-driven-platform/operation-handler-resolver`
- `@event-driven-platform/operation-event-envelope-factory`
- `@event-driven-platform/outbox`
- `@event-driven-platform/outbox-store`

### Execution engine

- `@event-driven-platform/runner`

This is the candidate set, not publication metadata. Issue #35 must revalidate the boundary after policy implementation and freeze the final public surface before any package is made publishable.

Packages outside this dependency boundary remain private unless later implementation proves that an additional consumer-facing contract is required.

## Policy classification

Runner policy outcomes must not be fabricated as domain `OperationResult` values.

`Runner.execute()` returns `OperationResultOf<TOperation>` only when the Operation has produced, or previously produced, a domain result. Guard and rate-limit policy denial therefore remains an execution-level outcome and is surfaced as a Runner error, not as a business rejection belonging to the Operation.

The execution model distinguishes three concepts:

1. **Domain result** — success, committed rejection, or rolled-back rejection produced by the Operation handler. These use the existing completion semantics.
2. **Execution policy rejection** — a configured guard or rate-limit policy refuses admission. It is not a domain result. The currently claimed attempt is failed without running the handler or writing Outbox records.
3. **Infrastructure execution failure** — resolver, evaluator, limiter, transaction, handler infrastructure, persistence, or other execution machinery fails unexpectedly. It is normalized as `ExecutionFailure` and recorded through the existing failure transition.

Policy rejection may use the existing `failed` attempt state because the current execution log has no separate policy-rejected terminal state. Its semantic category must remain distinguishable through the Runner error/failure code introduced by the relevant implementation issue.

## Deterministic sequencing

For one `Runner.execute()` / `executeDetailed()` invocation, the lifecycle is frozen as follows:

1. derive the deterministic `ExecutionId` from `operation.intent.id`;
2. call `ExecutionLogStore.claim()`;
3. handle the claim result before evaluating any policy:
   - `completed` -> return the stored result immediately;
   - `already-in-progress` -> fail with the existing concurrency error;
   - `intent-conflict` -> fail with the existing intent-conflict error;
   - `claimed` -> continue with the exact claimed attempt and lease;
4. evaluate configured guards in declaration order;
5. if guards pass, enforce the configured rate limit;
6. if admission succeeds, execute the handler attempt inside the existing execution transaction;
7. apply the configured per-attempt timeout to the handler/transaction work;
8. on a domain result, preserve the existing completion/rollback/Outbox semantics;
9. on an execution failure or timeout, roll back the execution transaction and record the current attempt as `failed` or `timed-out`;
10. when retry is allowed and the invocation retry budget remains, wait according to the configured strategy, atomically claim a new attempt for the same deterministic Execution, and execute the handler attempt again;
11. return only a completed domain result; otherwise surface the execution error after the current attempt has been transitioned as far as possible.

The ordering is intentional:

- idempotency and existing execution ownership win before mutable admission policies;
- guards run before rate limiting so commands rejected by a guard do not consume rate-limit capacity;
- admission policies run before domain transaction work;
- completion and Outbox persistence stay in the existing atomic transaction path.

## Guard semantics

- guards are Runner infrastructure and remain invisible to Operation and OperationHandler;
- guards are evaluated only after a new attempt has been successfully claimed;
- guards are evaluated once per Runner invocation, in declaration order;
- the first rejection stops evaluation;
- a guard rejection does not execute the handler, does not create a domain result, and does not append Outbox records;
- the claimed attempt is failed with a stable guard-rejection failure/error code;
- guard rejection is not internally retried by `CommandOptions.retry`;
- a later external invocation of the same intent may claim a new attempt and evaluate guards again;
- guard resolver/evaluator infrastructure failures are infrastructure failures, not domain rejections.

## Rate-limit semantics

- rate limiting is Runner infrastructure and remains invisible to Operation and OperationHandler;
- rate limiting is enforced after all guards pass and before handler transaction work;
- the final bucket identity is derived deterministically from the configured key/scope and Command/Operation context;
- capacity is consumed at most once per Runner invocation, not once per internal handler retry;
- rate-limit rejection does not execute the handler, does not create a domain result, and does not append Outbox records;
- the claimed attempt is failed with a stable rate-limit rejection failure/error code;
- rate-limit rejection is not internally retried by `CommandOptions.retry` under the current contract because no retry-after/admission-delay contract exists;
- a later external invocation may claim a new attempt and evaluate capacity again;
- limiter infrastructure failures are infrastructure failures, not policy rejections.

## Timeout semantics

`CommandOptions.timeoutMs` is a **per handler attempt** timeout, not a wall-clock budget for the complete Runner invocation.

- timeout applies only after admission succeeds;
- a timed-out attempt uses the existing `ExecutionLogStore.fail(... status: 'timed-out')` transition;
- timeout must reject the Runner-controlled transaction work so completion and Outbox persistence cannot proceed on the timed-out path;
- timeout does not claim to forcibly terminate arbitrary JavaScript or external side effects after the promise has been rejected;
- handlers must continue to respect the platform boundary: durable domain changes belong to the execution transaction and events are persisted through Outbox rather than directly published;
- timeout is eligible for retry when `CommandOptions.retry` permits another handler attempt;
- commands without retry configuration surface the timeout after the timed-out attempt is recorded.

## Retry semantics

`RetryOptions.maxAttempts` is the maximum number of **handler execution attempts performed by one Runner invocation**, including the first handler attempt.

It is intentionally separate from persisted `ExecutionLogEntry.attemptCount`, which is global execution history and may include attempts created by earlier Runner invocations or attempts that ended during admission policy evaluation.

- retry starts only after admission policies have passed;
- guard and rate-limit rejections are not part of the internal retry loop;
- each internal retry claims a new persisted execution attempt and lease for the same deterministic Execution identity;
- admission policies are not re-evaluated for internal retries in the same Runner invocation;
- retry is allowed only for failures classified as retryable, plus the defined timeout outcome;
- non-retryable failures are surfaced immediately after failure recording;
- fixed and exponential strategies determine only the delay before the next internal attempt;
- committed domain results are never retried;
- rolled-back domain rejections are completed results and are never retried;
- a retry cannot reuse a stale lease or complete a previous attempt;
- no retry may duplicate committed domain changes, completed results, or Outbox records.

## Lease and reclaim semantics

- every handler attempt operates under the lease returned by the claim that created that attempt;
- completion/failure must use that exact attempt id, owner id, and lease version;
- losing a lease prevents completion and preserves the existing rollback behavior;
- after a failed or timed-out attempt releases ownership through the store transition, an internal retry claims a new attempt rather than mutating the previous attempt;
- when Runner cannot persist failure, the original error remains authoritative and the active lease is allowed to expire so a later Runner invocation can reclaim execution;
- retry orchestration must not bypass `ExecutionLogStore.claim()`.

## Release constraints for implementation issues

Issues #31-#34 may introduce only the runtime abstractions needed to implement the semantics above. They must not merge Operation and Command responsibilities, move execution policy into Operation/OperationHandler, bypass Runner, bypass ExecutionLogStore, or weaken transaction/Outbox fencing.

Every implementation issue must add focused tests and keep the complete existing Runner test suite green. The final public package boundary is frozen only after those implementations are complete.

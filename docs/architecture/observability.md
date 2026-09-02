# Observability

EDP exposes technology-neutral typed lifecycle observations from its three centralized execution boundaries:

- Runner;
- Reader;
- UseCaseExecutor.

Consumers decide how to map those facts to metrics, traces, and logs. EDP does not prescribe OpenTelemetry, Prometheus, Grafana, or a logging backend.

Observations describe what happened. They do not contain telemetry commands such as incrementing counters or recording histogram buckets.

The public contracts live in `@event-driven-platform/observability`. Runner, Reader, and UseCaseExecutor each keep an independent typed lifecycle model and accept an optional observer. Each execution boundary internally wraps the supplied observer with the safe observability adapter; an observer failure therefore cannot change execution behavior. When no observer is supplied, execution behaves as no-op observability.

## Measurement rules

- Event counts are derived from observations. Example: one `retry.scheduled` observation means one retry was scheduled.
- Current state may be derived from paired observations. Example: `execution.started` adds one active execution and `execution.completed` removes one.
- Lifecycle durations are measured by the execution boundary that owns the lifecycle and are carried by completion observations.
- One observation may feed several production signals, traces, and logs.
- Observer failure must never change execution behavior.
- Observation payload may contain correlation data useful for traces/logs even when those fields are forbidden as metric dimensions.

## Metric dimensions

Metric dimensions must remain bounded enough for the deployment using them.

Default-safe dimensions are:

- operation name for Runner;
- read name for Reader;
- bounded outcome/reason/source/scope values defined by EDP;
- tenant when the observed boundary exposes a stable tenant identifier and the consumer explicitly enables it for a deployment with acceptable tenant cardinality.

The following must not be metric dimensions:

- user/actor identifiers;
- intentId;
- correlationId;
- executionId;
- attemptId;
- cache keys or partitions;
- arbitrary subject/aggregate identifiers;
- error messages or stack traces;
- other unbounded values.

These values may still be present in observations when needed for traces or structured logs.

A consumer may apply a stricter dimension policy. EDP must not force every observation field into metrics.

## Runner catalog

Runner observations use the Operation `name` as the stable operation dimension and may carry the Operation tenant as observation context.

| Observation           | Meaning                                                                                       | Operational question                                                                | Production signals                                                  | Metric dimensions                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `execution.requested` | Runner received a Command                                                                     | How much Runner demand is arriving?                                                 | request rate                                                        | operation; optional tenant                                                      |
| `execution.started`   | Runner claimed the execution and entered the execution pipeline                               | How many Operations are actually executing?                                         | active executions; execution start rate                             | operation; optional tenant                                                      |
| `execution.completed` | A started execution reached a terminal result                                                 | Are executions succeeding and how long do they take?                                | throughput; success/rejection/error/timeout rate; execution latency | operation; outcome; optional tenant                                             |
| `idempotency.hit`     | Claim returned the previously completed result without executing the Operation                | How often is duplicate work avoided?                                                | idempotency hit count/rate                                          | operation; optional tenant                                                      |
| `claim.rejected`      | Claim cannot proceed because the intent is already active or conflicts with the stored intent | Are callers producing concurrent duplicates or intent conflicts?                    | claim rejection count/rate                                          | operation; reason (`already-in-progress` or `intent-conflict`); optional tenant |
| `attempt.started`     | Runner begins a handler attempt                                                               | How much handler work is actually attempted?                                        | attempt count; active attempts when paired with completion          | operation; optional tenant                                                      |
| `attempt.completed`   | A handler attempt ends                                                                        | Are attempts failing, timing out, or becoming slow before the whole execution ends? | attempt outcome rate; attempt latency; retryable failure rate       | operation; outcome; retryable; optional tenant                                  |
| `retry.scheduled`     | Runner decides to retry after a failed attempt                                                | Where is Runner masking transient failure?                                          | retry count/rate; configured retry-delay distribution               | operation; optional tenant                                                      |
| `guard.rejected`      | A configured guard rejects execution                                                          | Which Operations are being stopped by guards?                                       | guard rejection count/rate                                          | operation; optional tenant                                                      |
| `rate-limit.rejected` | A configured rate limit rejects execution                                                     | Which Operations are being throttled?                                               | rate-limit rejection count/rate                                     | operation; optional tenant                                                      |

### Runner outcomes

`execution.completed` uses the bounded outcome set:

- `success` — successful Operation result;
- `rejected` — business Operation rejection returned as a result;
- `error` — execution failed with an error;
- `timed-out` — execution timeout ended the execution.

`attempt.completed` uses the same terminal categories where applicable and carries `retryable` for failed attempts.

## Reader catalog

Reader observations use `Read.name` as the stable read dimension. Current `Read` does not expose tenant identity, so Reader metrics do not invent a tenant dimension.

| Observation                          | Meaning                                                             | Operational question                                                     | Production signals                                                                         | Metric dimensions                                                                      |
| ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `read.requested`                     | Reader received a Query                                             | How much read demand is arriving?                                        | request rate                                                                               | read                                                                                   |
| `read.started`                       | Reader begins execution under its control boundary                  | How many Reads are active?                                               | active reads                                                                               | read                                                                                   |
| `read.completed`                     | Reader finishes or fails the Query                                  | Are Reads succeeding and how long do callers wait?                       | throughput; error/timeout/cancellation rate; end-to-end read latency                       | read; outcome                                                                          |
| `cache.lookup.completed`             | One configured cache level was read                                 | Which cache levels are useful or slow?                                   | hit/miss rate; cache lookup latency; cache read failure rate                               | read; cache scope (`local` or `shared`); level index; outcome (`hit`, `miss`, `error`) |
| `cache.population.completed`         | Reader attempted to populate one cache level                        | Is backfill working and how expensive is it?                             | population count; population failure rate; population latency                              | read; cache scope; level index; outcome (`success` or `error`)                         |
| `source.completed`                   | Reader executed the resolved source path                            | How often do Reads reach the source and is the source path slow/failing? | source execution rate; source error rate; source latency                                   | read; outcome                                                                          |
| `local-inflight.joined`              | A caller reused an already active process-local flight              | Is local request coalescing preventing duplicate work?                   | local coalescing count/rate                                                                | read                                                                                   |
| `distributed-coordination.completed` | Distributed coordination made a claim/wait/renew decision or failed | Is shared miss coordination effective and healthy?                       | owner/waiter rate; coordinator unavailable rate; ownership-lost rate; coordination latency | read; outcome (`owner`, `waiter`, `unavailable`, `ownership-lost`)                     |

Cache key values, namespaces, partitions, coordinator owner IDs, and lease identities are never metric dimensions.

### Reader outcomes

`read.completed` uses bounded outcomes supported by Reader control semantics:

- `success`;
- `error`;
- `timed-out`;
- `cancelled`.

## UseCaseExecutor catalog

Every UseCase explicitly defines a stable `name`. UseCaseExecutor copies that bounded identifier to `context.useCase` for every lifecycle observation. The observability model never derives identity from `constructor.name` or arbitrary extended context. UseCaseExecutor still has no tenant field in its public request contract.

| Observation            | Meaning                                                       | Operational question                                                     | Production signals                                                                 | Metric dimensions                                                                        |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `execution.requested`  | UseCaseExecutor received an execution request                 | How much durable UseCase demand is arriving?                             | request rate                                                                       | UseCase name                                                                             |
| `claim.completed`      | Durable claim returned a modeled result                       | Are invocations new, replayed, duplicated, or conflicting?               | claimed/replayed/already-in-progress/intent-conflict count and rate; claim latency | UseCase name; outcome (`claimed`, `completed`, `already-in-progress`, `intent-conflict`) |
| `execution.started`    | A successful claim entered UseCase execution                  | How many UseCases are actively executing under this Executor?            | active executions                                                                  | UseCase name                                                                             |
| `execution.completed`  | UseCase code execution ended                                  | Are UseCases succeeding and how long does application orchestration run? | success/error rate; UseCase execution latency                                      | UseCase name; outcome (`success` or `error`)                                             |
| `completion.completed` | Durable completion transition returned a modeled result       | Is successful UseCase work being durably committed?                      | completion success/rejection count; completion latency                             | UseCase name; outcome (`completed` or `rejected`)                                        |
| `release.completed`    | Best-effort release after a UseCase failure returned or threw | Are failed invocations being released cleanly for retry/recovery?        | release success/failure count; release latency                                     | UseCase name; outcome (`released` or `error`)                                            |

The current store contract does not distinguish a fresh claim from a reclaim through the Executor-visible claim result, so the catalog does not invent a `reclaimed` observation.

IntentId and correlationId are useful correlation context for traces/logs but are never metric dimensions.

## Derived production view

A telemetry consumer can build the following operational views from the implemented observation contracts:

| Boundary        | Production view                                                                                                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner          | request/throughput rate, active executions, p50/p95/p99 execution latency, outcome/error/timeout rate, attempts per execution, retry rate, idempotency hit rate, claim conflicts, guard rejections, rate-limit rejections                                             |
| Reader          | request/throughput rate, active reads, p50/p95/p99 read latency, outcome/error/timeout rate, cache hit ratio by scope/level, cache lookup latency, cache population health, source execution rate/latency/errors, local coalescing, distributed coordination outcomes |
| UseCaseExecutor | request rate by UseCase, active executions by UseCase, p50/p95/p99 UseCase execution latency, success/error rate, completed-result replay rate, duplicate/conflict rate, durable completion health, release health                                                    |

## Contract boundary

The implemented architecture preserves three separate lifecycle models:

- `RunnerObservation`;
- `ReaderObservation`;
- `UseCaseExecutorObservation`.

They share the generic one-method `Observer<TObservation>` shape plus `SafeObserver` and `NoopObserver`, but they are not collapsed into one untyped or loosely typed universal event model.

Observation is synchronous at the public type boundary. `SafeObserver` contains delegate exceptions, and the centralized execution boundaries install that safety wrapper internally so individual instrumentation calls do not add `try/catch` noise to Runner, Reader, or UseCaseExecutor.

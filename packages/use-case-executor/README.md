# @event-driven-platform/use-case-executor

Durable invocation boundary for application UseCases.

`UseCaseExecutor` derives the execution identity from the supplied UseCase `Intent`, claims the invocation through `UseCaseExecutionStore`, replays an already completed result, executes only a newly claimed UseCase, and persists successful completion before returning it.

The baseline executor intentionally does not implement retries, guards, rate limiting, transactions, Outbox behavior, transport concerns, or child Operation/Read execution. Those responsibilities remain outside the UseCase execution boundary.

`correlationId` is propagated unchanged into `UseCaseContext`; it never participates in execution identity or idempotency.

If a UseCase throws, the executor attempts a fenced release and rethrows the original UseCase error. A rejected durable completion is surfaced as a typed executor transition error rather than returning an unpersisted result.

Lease heartbeat/renewal for long-running UseCases is deliberately not part of this baseline contract and is added separately by the Epic.

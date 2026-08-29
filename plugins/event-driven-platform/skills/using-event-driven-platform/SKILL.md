---
name: using-event-driven-platform
description: This skill should be used when designing, implementing, reviewing, or debugging application code that consumes @event-driven-platform/* packages, including UseCases, Operations, Commands, Runner, Reads, Queries, Reader, Intent derivation, event-driven continuation, execution adapters, and EDP runtime composition.
---

# Using Event Driven Platform

Apply Event Driven Platform as a set of explicit architectural boundaries, not as a framework to bypass or reshape for local convenience.

## Start from evidence

Before proposing or changing code:

1. Read the consumer repository's applicable `AGENTS.md`, `CLAUDE.md`, local architecture documentation, and nearby implementation patterns.
2. Inspect the exact `@event-driven-platform/*` package versions installed by the consumer repository.
3. Inspect the public exports, types, package README files, and existing consumer usage for the EDP packages involved in the task.
4. Consult the current EDP canonical documentation when architectural semantics are material or unclear:
   - `https://github.com/sanshan/event-driven-platform/blob/main/docs/architecture/README.md`
   - `https://github.com/sanshan/event-driven-platform/blob/main/docs/execution-public-api.md`
   - `https://github.com/sanshan/event-driven-platform/blob/main/docs/read-public-api.md`
   - `https://github.com/sanshan/event-driven-platform/blob/main/docs/use-case-execution-public-api.md`
5. Prefer repository and installed-package evidence over remembered EDP APIs. Do not invent exports, options, lifecycle behavior, or package names.

Treat EDP documentation as the source of architectural truth. Keep this skill procedural; do not replace canonical documentation with remembered summaries from this file.

## Model the business flow first

Identify the requested business flow before choosing EDP primitives.

Determine:

- the application UseCase being performed;
- each atomic business state-changing action;
- each business-oriented data read;
- whether work is synchronous or continued asynchronously from an Event;
- which effects are logically distinct and therefore need distinct deterministic Intent identities.

Use a UseCase to orchestrate multiple pieces of application work. Do not turn an Operation into an application workflow merely because the workflow is small.

## Preserve execution boundaries

Keep the write pipeline separated:

```text
Operation -> Command -> Runner
```

Keep the read pipeline separated:

```text
Read -> Query -> Reader
```

Keep application orchestration above those pipelines:

```text
UseCaseExecutor -> UseCase -> Runner / Reader
```

Apply these constraints while designing or reviewing code:

- Keep Operations business-oriented and atomic.
- Execute Operations through Runner using Commands.
- Do not make Operations execute other Operations.
- Do not publish messages from Operations or Operation handlers.
- Keep Reads business-oriented and infrastructure-independent.
- Execute Reads through Reader using Queries.
- Keep ReadHandlers source-specific.
- Do not make ReadHandlers populate caches.
- Do not bypass Runner or Reader by recreating their execution behavior locally.
- Do not merge Operation with Command or Read with Query.
- Do not move retry, timeout, rate limiting, caching, transport, persistence, or coordination concerns into business intents.

When the task appears to require breaking one of these boundaries, verify the current EDP architecture before proceeding and explain the conflict instead of silently introducing a shortcut.

## Compose UseCases deliberately

For service/application entrypoints that use the EDP UseCase layer, execute through `UseCaseExecutor -> UseCase` according to the installed contracts.

Inside a concrete UseCase:

- use Runner for writes;
- use Reader for reads;
- use previous results to make business decisions when needed;
- use parallel execution only when the business effects are independent;
- keep execution infrastructure inside the corresponding EDP boundary rather than reimplementing it in the UseCase.

Do not replace Event-driven continuation with direct UseCase-to-UseCase calls when the business flow is asynchronous. Preserve the current EDP event continuation model defined by canonical architecture documentation.

## Derive deterministic Intent identity

Treat Intent as logical action identity, not tracing metadata.

For child Operations created by a UseCase, identify a stable semantic child slot. For one-to-many effects, also identify a stable business discriminator. Reconstruct the same logical child with the same Intent across retries.

Do not derive logical child identity from values that can vary during replay, including:

- timestamps;
- random values;
- process-local counters;
- array position or incidental iteration order;
- mutable read ordering;
- CorrelationId.

Treat CorrelationId as distributed-flow tracing context and propagate it according to the current EDP contracts. Do not use it as an idempotency key.

Before implementing Intent derivation, inspect the installed `@event-driven-platform/intent` API and existing consumer patterns instead of reconstructing factory signatures from memory.

## Reuse existing EDP capabilities

Before adding a new local abstraction, adapter, wrapper, execution helper, cache mechanism, retry mechanism, or orchestration layer:

1. Search the consumer repository for an existing equivalent.
2. Search the installed EDP packages for an existing contract or adapter.
3. Check the applicable EDP public API documentation.
4. Add a consumer-specific abstraction only when a real application boundary remains.

Avoid facades that merely rename EDP concepts or hide Runner/Reader composition without adding a genuine consumer responsibility.

## Keep package usage explicit

Import through public package entry points. Do not deep-import EDP implementation files.

Install and depend only on packages the consumer imports directly. Do not assume a repository-wide EDP facade exists.

Before changing an EDP package version, inspect compatibility and the consumer's current lockfile/package-manager workflow.

## Verify the result

Before considering an EDP consumer change complete, verify all of the following:

1. The requested business flow is represented by the correct UseCase, Operation, and Read responsibilities.
2. Every Operation executes through Runner.
3. Every Read executes through Reader.
4. Application entrypoint behavior follows the installed UseCase execution contracts where that layer is in use.
5. Intent derivation is deterministic for retryable logical effects.
6. CorrelationId is propagated but never used as logical identity.
7. Operations and Reads remain free of infrastructure concerns.
8. No duplicate EDP mechanism or unnecessary wrapper was introduced.
9. Imports use package public APIs that exist in the consumer's installed versions.
10. Tests protect business/application behavior and architectural contracts rather than reproducing EDP's own internal tests.
11. Repository-supported lint, typecheck, test, and build checks pass for the affected scope.

When repository evidence and EDP documentation disagree, stop treating the remembered model as authoritative. Report the discrepancy and base implementation decisions on the exact installed contract unless the task explicitly includes an EDP upgrade.

# Repository Engineering Instructions

These instructions apply to the whole repository unless a more specific nested `AGENTS.md` exists for the target path.

Before modifying any file, check the target directory and its ancestor directories for a more specific `AGENTS.md`. If one exists, read it before making changes in its scope, follow both root and nested instructions, and let the nested instructions take precedence for scope-specific rules.

## Repository Principles

This repository is a reusable platform for distributed event-driven systems. Architectural clarity, explicit boundaries, composability, determinism, observability, and testability are preferred over framework convenience or local shortcuts.

Preserve the two implemented and independent execution pipelines:

```text
Write: Operation -> Command -> Runner
Read:  Read      -> Query   -> Reader
```

The implemented application-orchestration layer sits above those pipelines. Supported service/application entrypoints execute business flows through `UseCaseExecutor -> UseCase`; concrete UseCases may compose Runner and Reader, but neither UseCase nor UseCaseExecutor replaces or bypasses those execution boundaries. Event-triggered continuation remains `Operation -> Event -> Consumer -> UseCaseExecutor -> downstream UseCase`, not direct UseCase-to-UseCase orchestration.

On the write side, Operations remain business-oriented, Commands transport execution concerns, and Runner owns execution infrastructure. Operations do not execute other Operations or publish messages directly; emitted Events are persisted to Outbox by Runner.

On the read side, Reads remain business-oriented, Queries transport declarative execution controls, and Reader owns read execution orchestration. ReadHandlers read from one source responsibility and never write caches. Cache readers and cache writers remain separate capabilities; cache traversal/population and optional local/distributed in-flight coordination belong to Reader rather than Read, Query, or ReadHandler.

Do not merge Operation and Command, merge Read and Query, allow Operations to publish messages or execute other Operations, bypass Runner, bypass Reader, or move cache writes into ReadHandlers. Use [`docs/architecture/README.md`](docs/architecture/README.md) as the canonical source for deeper architectural semantics and current maturity status rather than duplicating or extrapolating architecture here.

## Evidence Before Assumptions

Do not guess when the answer can be discovered. Prefer evidence in this order: current repository state and surrounding implementation; applicable `AGENTS.md` and repository documentation; installed tool or package documentation; current official vendor documentation; other external references; explicit inference only when evidence is unavailable.

Before introducing a new abstraction, naming convention, directory pattern, dependency relationship, result/error representation, configuration, infrastructure mechanism, or implementation pattern, search the repository for an existing equivalent. Prefer extending a coherent established pattern over introducing a parallel one.

Existing code is evidence, not automatically a best practice. If a material decision still depends on an assumption, make that assumption explicit instead of silently proceeding.

## Prefer Vendor-Supported Mechanisms

Before implementing tooling, infrastructure integration, scaffolding, package management, build/test/release behavior, or another cross-cutting mechanism, determine whether the responsible tool or library already provides an official solution.

Prefer current vendor-supported mechanisms and official documentation over custom scripts, wrappers, compatibility layers, hand-maintained orchestration, duplicated framework behavior, or undocumented workarounds. This applies to every dependency whether or not it is named here. Current examples include Nx, pnpm workspaces, TypeScript, ESLint, Prettier, Vitest, Vite, and Verdaccio.

Do not infer CLI flags, configuration options, framework behavior, or vendor APIs from memory when they can be verified.

## Custom Mechanisms Require Approval

If a task appears to require a new custom cross-cutting mechanism instead of an established repository or vendor-supported solution, do not implement it silently. First present the problem, mechanisms investigated, why they are insufficient, the proposed mechanism, meaningful alternatives, and expected maintenance cost.

This applies to custom frameworks, infrastructure/tooling mechanisms, generalized wrappers, compatibility layers, build/release/configuration systems, code generation, and generalized orchestration. It does not require approval for ordinary domain types, local interfaces, value objects, or straightforward implementation details.

## Code Organization

Organize production code into small, cohesive modules. A source file should normally represent one primary concept or responsibility.

- Keep independently meaningful classes in separate files.
- Put independently meaningful interfaces and type aliases in appropriately named files when they represent distinct concepts.
- Do not accumulate unrelated classes, types, helpers, constants, and implementations in one large file merely because they belong to the same feature.
- Group growing areas into meaningful responsibility-oriented subdirectories rather than large flat collections.
- Avoid generic dumping grounds such as `types.ts`, `helpers.ts`, `utils.ts`, or `common.ts` when their contents have distinct meanings.
- Use file and directory names that communicate purpose.
- Do not split files merely to satisfy an arbitrary line-count limit; split when concepts or responsibilities can be named independently.

`packages/runner/src/lib` and `packages/reader/src/lib` are useful local examples of responsibility-oriented organization. Treat them as references for intent, not as mechanical templates.

## Abstractions

Do not create abstractions only for hypothetical future needs. Introduce one when it represents a real architectural boundary, domain concept, replaceable dependency, public contract, demonstrated variation, or materially useful testability boundary.

Do not introduce generalized managers, providers, strategies, factories, adapters, or helper layers merely because they might become useful later. Prefer the simplest explicit design that preserves architectural boundaries.

## Dependencies and Public APIs

Treat dependencies and exported package symbols as architectural decisions.

Before adding a dependency, check whether the language/runtime, workspace toolchain, existing dependencies, or an official framework mechanism already provides the capability. Do not add a dependency solely to avoid a trivial amount of implementation code.

Respect Nx project/module boundaries and use package public entry points instead of cross-package deep imports. Treat exported symbols as public contracts; avoid accidental exports of implementation details. Before changing a public export, inspect current consumers and consider compatibility and release impact.

## Testing

Tests should provide confidence in important behavior without unnecessary duplication or complexity.

Before adding a test, inspect relevant existing tests, identify what guarantees they already protect, and determine the distinct guarantee the new test adds. Every new test should protect a distinct behavior, contract, invariant, regression, or architectural guarantee.

If a proposed test overlaps an existing one, prefer restructuring the tests so each has a clear responsibility instead of appending redundant coverage.

Avoid duplicate assertions of the same guarantee without a specific reason, testing implementation details when observable behavior already protects the contract, large custom harnesses for simple scenarios, abstractions that make tests harder to read than direct setup, and tests added only to increase test count or nominal coverage.

Keep tests as simple as possible while protecting meaningful behavior. Do not weaken important architectural tests merely to reduce test count.

## Scope and Root-Cause Fixes

Keep changes focused on the requested task. Do not refactor unrelated code unless necessary to make the requested change coherent, preserve an architectural boundary, remove duplication directly introduced or exposed by the change, or fix a problem blocking correct implementation.

When build, typecheck, lint, test, package resolution, workspace, or release behavior fails, identify the underlying cause before adding a workaround. Do not use exclusions, aliases, ignores, overrides, suppressions, force flags, or special-case scripts merely to make checks green.

Escape hatches such as `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, broad unsafe type casts, dependency overrides/resolutions, configuration suppressions, or force flags require a concrete reason and must remain narrowly scoped.

## Generated Files and Managed Configuration

Do not manually edit generated files unless the responsible tool explicitly documents that they are intended for manual modification. Preserve generated markers and tool-managed boundaries, and use the responsible tool or generator whenever an official mechanism exists.

## Verification

Use repository-supported tooling for verification. Run tasks through Nx where Nx owns the task, and prefer existing project targets and workspace configuration over invoking underlying tools directly.

Before considering work complete, verify the affected implementation, run relevant repository checks where applicable, inspect the final diff for accidental scope expansion, confirm public APIs/package boundaries changed only when intended, and confirm no workaround or custom mechanism was introduced without justification.

Do not invent a special verification mechanism when existing repository tooling already provides the required check.

## External Guidance

Community conventions are references, not authorities. Do not copy a rule, directory structure, or agent instruction merely because it appears in a popular repository. Adopt external practices only when they address a concrete repository need and align with its architecture, current vendor guidance, or an explicitly chosen repository policy.

Keep this file concise and operational. `AGENTS.md` is a set of stable engineering guardrails and a map to deeper repository knowledge, not a complete repository manual.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

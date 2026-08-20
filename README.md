# event-driven-platform

Reusable TypeScript building blocks for distributed event-driven systems.

## Public packages

The first public release was **v0.1.0** and contained the foundational write-side domain contracts:

- `@event-driven-platform/types` — shared branded-type primitives;
- `@event-driven-platform/actor` — actor contracts and factory;
- `@event-driven-platform/subject` — subject contracts and factory;
- `@event-driven-platform/aggregate-reference` — typed aggregate references;
- `@event-driven-platform/tenant-reference` — typed tenant references;
- `@event-driven-platform/intent` — deterministic operation intent contracts;
- `@event-driven-platform/event` — event and event-envelope contracts;
- `@event-driven-platform/operation-result` — operation result contracts;
- `@event-driven-platform/operation` — atomic domain operation contracts.

The next approved public boundary is the write execution pipeline:

```text
Operation -> Command -> Runner
```

It adds:

- command policy contracts: `guard`, `rate-limit`, `retry`, `command`;
- execution identity and persistence contracts: `clock`, `execution`, `execution-log`, `execution-log-store`, `execution-transaction`;
- handler and Outbox composition contracts: `operation-handler`, `operation-handler-resolver`, `operation-event-envelope-factory`, `outbox`, `outbox-store`;
- the centralized execution engine: `runner`.

Consumers install only the packages they import directly. A typical Runner composition starts with:

```bash
pnpm add \
  @event-driven-platform/command \
  @event-driven-platform/runner \
  @event-driven-platform/execution-log-store \
  @event-driven-platform/execution-transaction \
  @event-driven-platform/operation-handler-resolver \
  @event-driven-platform/outbox-store
```

See [docs/execution-public-api.md](./docs/execution-public-api.md) for the complete package boundary and consumer composition model, and [docs/execution-release-readiness.md](./docs/execution-release-readiness.md) for the execution-policy semantics and preserved lifecycle guarantees.

Packages that are not ready for publication remain private in their own package manifests.

## Architecture

The platform keeps the write and read pipelines separate:

```text
Operation -> Command -> Runner
Read      -> Query   -> Reader
```

Operations and Reads are business-oriented. Commands and Queries transport execution/read options. Runner and Reader remain centralized infrastructure-oriented engines.

The read pipeline remains private and incomplete.

## Versioning and releases

Public packages are independently versioned with Nx Release. Nx determines release versions from Conventional Commits and the project graph, updates dependent packages when required, creates project changelogs, and creates package-specific tags.

The repository does not maintain fixed `core`/`execution` release groups or custom release tag namespaces.

See [RELEASING.md](./RELEASING.md) for the release workflow.

## Development

Use Nx for dependency-aware validation:

```bash
pnpm nx affected -t lint test typecheck build
```

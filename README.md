# event-driven-platform

Reusable TypeScript building blocks for distributed event-driven systems.

## Public core

The first public release is **v0.1.0** and contains the foundational write-side domain contracts:

- `@event-driven-platform/types` — shared branded-type primitives;
- `@event-driven-platform/actor` — actor contracts and factory;
- `@event-driven-platform/subject` — subject contracts and factory;
- `@event-driven-platform/aggregate-reference` — typed aggregate references;
- `@event-driven-platform/tenant-reference` — typed tenant references;
- `@event-driven-platform/intent` — deterministic operation intent contracts;
- `@event-driven-platform/event` — event and event-envelope contracts;
- `@event-driven-platform/operation-result` — operation result contracts;
- `@event-driven-platform/operation` — atomic domain operation contracts.

Install packages individually through the normal npm registry, for example:

```bash
pnpm add @event-driven-platform/operation @event-driven-platform/operation-result
```

## Execution release group

The next approved public boundary is the write execution pipeline:

```text
Operation -> Command -> Runner
```

The Execution release group is versioned independently from the core and uses tags in the form `execution-v{version}`. Its first approved release set contains:

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

Packages outside the approved core and Execution release groups remain private until their contracts and runtime behavior are explicitly reviewed for release.

## Architecture

The platform keeps the write and read pipelines separate:

```text
Operation -> Command -> Runner
Read      -> Query   -> Reader
```

Operations and Reads are business-oriented. Commands and Queries transport execution/read options. Runner and Reader remain centralized infrastructure-oriented engines.

The read pipeline remains private and incomplete; publishing the Execution group does not expand the read-side release boundary.

## Compatibility

During the `0.x` series:

- patch releases are backward compatible;
- breaking public API changes require a new minor version and explicit release notes;
- no compatibility guarantee applies to private workspace packages.

Core and Execution are separate fixed Nx Release groups and may advance independently while preserving declared cross-group dependency compatibility.

See [RELEASING.md](./RELEASING.md) for the Nx Release workflow, local-registry verification, versioning, tag namespaces, and npm publishing process.

## Development

Use Nx for workspace tasks and dependency-aware validation:

```bash
pnpm nx affected -t lint test typecheck build
```

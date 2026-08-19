# event-driven-platform

Reusable TypeScript building blocks for distributed event-driven systems.

## Public core

The first public release is **v0.1.0** and contains only the foundational write-side domain contracts:

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

All other workspace packages remain private until their public contracts and runtime behavior are ready for an explicit release.

## Architecture

The platform keeps the write and read pipelines separate:

```text
Operation -> Command -> Runner
Read      -> Query   -> Reader
```

Operations and Reads are business-oriented. Commands and Queries transport execution/read options. Runner and Reader remain centralized infrastructure-oriented engines.

The v0.1.0 release intentionally publishes only the stable foundational contracts and does not publish the incomplete execution or read pipelines.

## Compatibility

During the `0.x` series:

- patch releases are backward compatible;
- breaking public API changes require a new minor version and explicit release notes;
- no compatibility guarantee applies to private workspace packages.

See [RELEASING.md](./RELEASING.md) for the Nx Release workflow, local-registry verification, versioning, and npm publishing process.

## Development

Use Nx for workspace tasks and dependency-aware validation:

```bash
pnpm nx affected -t lint test typecheck build
```

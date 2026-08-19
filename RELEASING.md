# Releasing

Nx Release manages the public core as one fixed release group named `core`.

## First release

Preview the first release before making changes:

```bash
pnpm nx release 0.1.0 --first-release --dry-run
```

The preview must target exactly the projects listed in `release.groups.core.projects` in `nx.json`.

## Versioning

Version selection follows Conventional Commits.

While the public API is in the `0.x` series:

- breaking changes (`!` or `BREAKING CHANGE`) bump the minor version;
- `feat` bumps the patch version;
- `fix` bumps the patch version.

All projects in the `core` group share one version and are released together.

## Internal dependencies

`workspace:*` remains in source manifests. pnpm resolves workspace protocols to publishable ranges when packages are packed or published. Local-registry verification must confirm the published dependency graph.

## Changelogs

Nx Release generates changelogs only for the public package projects. Workspace-level changelog generation is disabled.

## Registry

The registry is supplied by the release environment. Package manifests do not pin a registry, so the same Nx Release configuration can be used with a local registry and the production registry.

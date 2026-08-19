# Releasing

Nx Release manages the public core as one fixed release group named `core`.

## Public release set

Only the projects listed in `release.groups.core.projects` in `nx.json` are released. All other workspace projects remain outside the release flow.

## First release

Preview the first release before making any changes:

```bash
pnpm nx release 0.1.0 --first-release --dry-run
```

The preview must target exactly the configured `core` projects.

## Versioning after v0.1.0

Version selection follows Conventional Commits through Nx Release.

While the public API is in the `0.x` series:

- breaking changes (`!` or `BREAKING CHANGE`) bump the minor version;
- features (`feat`) bump the patch version;
- fixes (`fix`) bump the patch version.

All projects in the `core` group share the same version and are released together.

## Changelogs

Nx Release generates a changelog for each public package. Workspace-level changelog generation is disabled so changes to private projects do not become part of a shared public release history.

## Registry

Package manifests do not pin a registry. The registry is supplied by the release environment so the same Nx Release configuration can be verified against a local registry before production publishing.

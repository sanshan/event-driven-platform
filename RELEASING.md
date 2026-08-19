# Releasing

Nx Release manages the public core as one fixed release group named `core`.

## First release

Preview the first release before making changes:

```bash
pnpm nx release 0.1.0 --first-release --dry-run
```

The preview must target exactly the projects listed in `release.groups.core.projects` in `nx.json`.

Prepare the release from a verified `main` state without publishing locally:

```bash
pnpm nx release 0.1.0 --first-release --skip-publish
```

Push the resulting release commit and `v0.1.0` tag. The tag triggers `.github/workflows/publish.yml`.

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

## Production publishing

Production publishing is tag-triggered and restricted to the `core` release group. The publish workflow verifies that:

- the tagged commit is contained in `main`;
- the tag version matches all nine public package manifests;
- the Nx `core` release group still contains exactly the approved package set;
- every package outside that set remains private.

The workflow builds the public core and runs:

```bash
pnpm nx release publish --groups=core --access=public
```

The `npm-production` GitHub environment should require maintainer approval before publishing.

### Authentication

Prefer npm Trusted Publishing (OIDC). Configure each published package to trust:

- repository: `sanshan/event-driven-platform`;
- workflow file: `publish.yml`;
- environment: `npm-production`;
- allowed action: `npm publish`.

Trusted publishing requires npm CLI 11.5.1+ and Node 22.14.0+. The workflow pins versions that satisfy these requirements and grants only `contents: read` and `id-token: write`.

For the initial publication only, the packages do not yet exist on npm and therefore cannot have trusted publishers configured in advance. `NPM_ACCESS_TOKEN` may be configured as a bootstrap credential. After v0.1.0 is published, configure trusted publishing for all nine packages, verify OIDC publishing, then remove the bootstrap token.

Trusted publishing automatically provides npm provenance. `NPM_CONFIG_PROVENANCE=true` remains enabled so token-based bootstrap publishing also requests provenance.

### Recovery

Do not create a new version or tag to recover from a partial publishing failure. Fix only authentication or registry availability issues, then rerun the workflow for the same release tag. Verify the registry state before retrying; Nx Release publishing checks package versions in the registry and avoids republishing versions that already exist.

## Registry

The registry is supplied by the release environment. Package manifests do not pin a registry, so the same Nx Release configuration can be used with a local registry and the production registry.

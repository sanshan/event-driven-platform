# Releasing

Nx Release manages two independent fixed public release groups:

- `core` — the foundational write-side contracts, tagged as `v{version}`;
- `execution` — the `Operation -> Command -> Runner` execution package set, tagged as `execution-v{version}`.

The exact project lists are owned by `release.groups` in `nx.json`. Packages outside those approved groups must remain private.

## Core release

The initial core release is **v0.1.0**.

Preview a core release before making changes:

```bash
pnpm nx release <version> --groups=core --dry-run
```

For the first core release, `--first-release` is also required.

Prepare a verified core release without publishing locally:

```bash
pnpm nx release <version> --groups=core --skip-publish
```

Push the resulting release commit and `v<version>` tag. The tag triggers `.github/workflows/publish.yml` for the `core` group.

## First Execution release

The first Execution release is prepared independently from the already released core.

Preview the first Execution release:

```bash
pnpm nx release 0.1.0 --groups=execution --first-release --dry-run
```

The preview must version exactly the projects listed in `release.groups.execution.projects`, leave the core release group unchanged, and use the `execution-v0.1.0` tag namespace.

After the Epic release-readiness review is merged to a green `main`, prepare the release without publishing from the local command:

```bash
pnpm nx release 0.1.0 --groups=execution --first-release --skip-publish
```

Review the generated package versions, internal dependency ranges, changelogs, release commit, and tag before pushing them. Push the release commit and `execution-v0.1.0` tag only after that review. The tag triggers `.github/workflows/publish.yml` for the `execution` group.

## Versioning

Version selection follows Conventional Commits.

While a public API is in the `0.x` series:

- breaking changes (`!` or `BREAKING CHANGE`) bump the minor version;
- `feat` bumps the patch version;
- `fix` bumps the patch version.

Projects inside each fixed release group share one version. The `core` and `execution` groups are versioned independently and use distinct tag namespaces.

## Internal dependencies

`workspace:*` remains in source manifests. pnpm resolves workspace protocols to publishable ranges when packages are packed or published. Package and local-registry verification must confirm the resulting published dependency graph.

The Execution release lifecycle additionally verifies compatibility with the already published core `0.1.0` packages from an isolated consumer installation.

## Changelogs

Nx Release generates project changelogs for public package projects. Workspace-level changelog generation is disabled.

## Verification before production release

For Execution changes, CI verifies:

- affected lint, test, typecheck, and build targets;
- the exact approved public/private release boundary;
- packed core + Execution artifacts in an isolated consumer;
- publication of exactly the Execution group through Nx Release to a local Verdaccio registry;
- installation and strict TypeScript compilation without workspace source resolution;
- representative ESM execution of `Operation -> Command -> Runner` with guard, rate-limit, timeout, and retry configuration;
- compatibility with the existing public core.

The final release-readiness review must also run a release dry run for `--groups=execution` and verify the generated project/version set before a production tag is pushed.

## Production publishing

Production publishing is tag-triggered. `.github/workflows/publish.yml` resolves the release group from the tag namespace:

- `v<version>` -> `core`;
- `execution-v<version>` -> `execution`.

Before publishing, the workflow verifies that:

- the tagged commit is contained in `main`;
- the tag version matches every package manifest in the selected release group;
- the selected Nx release group still contains exactly its approved package set;
- every package outside the approved core and Execution boundaries remains private.

The workflow then builds only the selected release group and runs:

```bash
pnpm nx release publish --groups=<core|execution> --access=public
```

The `npm-production` GitHub environment should require maintainer approval before publishing.

### Authentication

Production publishing uses npm Trusted Publishing (OIDC) only.

Each published package must trust:

- repository: `sanshan/event-driven-platform`;
- workflow file: `publish.yml`;
- environment: `npm-production`;
- allowed action: `npm publish`.

Before the first Execution release, Trusted Publishing must be configured in npm for every package in `release.groups.execution.projects`.

The workflow grants only `contents: read` and `id-token: write`, and pins Node/npm versions compatible with npm Trusted Publishing.

No long-lived npm token is required by the publish workflow. For maximum protection, package publishing access should require two-factor authentication and disallow bypass-2FA tokens. Trusted Publishing continues to work with this setting and automatically provides npm provenance.

### Recovery

Do not create a new version or tag to recover from a partial publishing failure. Fix only authentication or registry availability issues, then rerun the workflow for the same release tag. Verify registry state before retrying; Nx Release publishing checks package versions in the registry and avoids republishing versions that already exist.

## Registry

The registry is supplied by the release environment. Package manifests do not pin a registry, so the same Nx Release configuration can be used with the local registry and the production registry.

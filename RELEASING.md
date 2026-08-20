# Releasing

Nx Release is the source of truth for package versioning and publishing.

Packages are released independently. The workspace does not maintain custom release groups or calculate package versions itself.

## Release configuration

Nx discovers package projects through the workspace and targets `packages/*` for release management.

`nx.json` configures:

- `projectsRelationship: independent`;
- Conventional Commits for automatic version selection;
- project-level changelogs;
- standard Nx dependency-aware updates between packages.

Public/private publication intent remains package-local in each `package.json`. Packages that are not ready for npm must keep `private: true`.

Nx uses its standard independent tag format:

```text
{projectName}@{version}
```

No repository-specific tag namespaces are used.

## Prepare a release

Always preview the release first:

```bash
pnpm nx release --dry-run --skip-publish
```

Nx determines which packages have releasable changes and calculates each version independently from Conventional Commits.

Prepare the release without publishing from the local machine:

```bash
pnpm nx release --skip-publish
```

Review the generated package versions, internal dependency updates, project changelogs, release commit, and package tags, then push them:

```bash
git push
git push --tags
```

Do not manually calculate package version bumps. Do not manually maintain a list of packages to release.

## First independent release

The repository previously used a fixed `v0.1.0` release for the initial public core, so package-specific independent release tags do not yet exist.

For the first release after switching to independent versioning, use Nx's standard first-release mode:

```bash
pnpm nx release --first-release --dry-run --skip-publish
```

After reviewing the Nx output, prepare it with:

```bash
pnpm nx release --first-release --skip-publish
```

This is a one-time transition. Future releases must omit `--first-release`.

## Versioning

Version selection follows Conventional Commits and is performed by Nx Release.

With `adjustSemverBumpsForZeroMajorVersion` enabled, Nx applies its pre-1.0 semver adjustment rules automatically.

Nx also handles dependency-aware version updates for independently versioned packages. Repository scripts must not reproduce this logic.

## Package artifacts

Source manifests use pnpm workspace dependencies. CI packs every public package and installs the resulting tarballs into an isolated fixture to verify that published artifacts are consumable without workspace source resolution.

This verification checks package output; it does not decide versions or which packages Nx should release.

## Production publishing

Independent releases create one tag per released project. GitHub does not reliably trigger tag-push workflows when more than three tags are pushed together, so production publishing follows the Nx-documented `workflow_dispatch` approach.

After the release commit and tags have been pushed:

1. Open the **Publish** GitHub Actions workflow.
2. Run it from `main`.
3. Approve the `npm-production` environment when required.

The workflow builds package projects and runs only:

```bash
pnpm nx release publish
```

Nx determines which versioned packages need publication and skips versions that already exist in the registry.

### Authentication

Production publishing uses npm Trusted Publishing (OIDC) only.

Each public package must trust:

- repository: `sanshan/event-driven-platform`;
- workflow file: `publish.yml`;
- environment: `npm-production`;
- allowed action: `npm publish`.

The workflow grants only `contents: read` and `id-token: write`. No long-lived npm token is required.

### Recovery

If production publishing is interrupted, do not create replacement versions. Fix the external failure and rerun the **Publish** workflow from the same release commit. Nx Release checks registry state and does not need repository-specific retry logic.

# Releasing

Nx Release is the source of truth for package versioning and publishing.

Packages are released independently. The workspace does not maintain custom release groups or calculate package versions itself.

## Release configuration

Nx discovers package projects through the workspace and targets `packages/*` for release management.

`nx.json` configures:

- `projectsRelationship: independent`;
- Conventional Commits for automatic version selection;
- `fallbackCurrentVersionResolver: disk` so packages without an independent release tag can transition from the version already stored in their manifest;
- project-level changelogs with `automaticFromRef` so a package without a previous independent tag can derive its initial changelog range from git history;
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

Nx determines which projects have releasable changes and calculates each version independently from Conventional Commits.

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

## Transition from the fixed v0.1.0 release

The repository previously used a single fixed `v0.1.0` tag for the initial public core, so the first independent release starts without package-specific tags.

This transition is handled by normal Nx Release configuration rather than `--first-release`:

- `fallbackCurrentVersionResolver: disk` uses each manifest's current version when no matching `{projectName}@{version}` tag exists;
- `changelog.automaticFromRef: true` lets Nx derive the initial project changelog range when no previous matching package tag exists.

Run the same normal dry-run and release commands shown above. After the first independent release, package-specific tags become the normal version history automatically.

## Versioning

Version selection follows Conventional Commits and is performed by Nx Release.

With `adjustSemverBumpsForZeroMajorVersion` enabled, Nx applies its pre-1.0 semver adjustment rules automatically.

Nx also handles dependency-aware version updates for independently versioned packages. Repository scripts must not reproduce this logic.

## Package verification

CI follows the Nx local-registry testing pattern.

`tools/start-local-registry.ts` starts Verdaccio through `@nx/js:verdaccio`, versions the current workspace with the temporary `0.0.0-e2e` version using `releaseVersion()`, and publishes it with `releasePublish()`. The setup does not maintain package lists, release groups, production-version knowledge, or registry baselines.

An isolated consumer then installs its declared dependencies from Verdaccio and compiles against the published declarations with no workspace path resolution.

The consumer executes representative ESM flows for both supported execution pipelines:

```text
Operation -> Command -> Runner
Read      -> Query   -> Reader
```

The Read fixture always verifies no-cache execution and bounded process-local InMemory caching. When the affected Read graph requires Redis-backed verification, CI keeps the existing temporary Redis service alive for the package-verification step and supplies `READ_PACKAGE_VERIFICATION_REDIS_URL`; the same external consumer then verifies shared Redis L2 plus distributed read-execution coordination across two Reader instances.

Redis-backed external verification is conditional so unrelated changes do not pay the Redis service overhead. The Verdaccio/local-registry mechanism itself remains the same Nx Release path used by the write fixture.

The verification proves that package manifests, root exports, declaration files, transitive package dependencies, ESM runtime artifacts, and representative consumer composition work outside the monorepo.

Nx Release remains responsible for release versioning; `private: true` remains the package-level publication boundary, and the consumer fixture only declares packages that it directly imports.

## Production publishing

Independent releases create one tag per released project. GitHub does not reliably trigger tag-push workflows when more than three tags are pushed together, so production publishing follows the Nx-documented `workflow_dispatch` approach.

After the release commit and tags have been pushed:

1. Open the **Publish** GitHub Actions workflow.
2. Run it from `main`.
3. Approve the `npm-production` environment when required.

The workflow builds package projects and runs:

```bash
pnpm nx release publish
```

Nx publishes publishable package versions prepared by the release state. Packages with `private: true` are not published.

### Authentication

The permanent production authentication model is npm Trusted Publishing (OIDC).

Each public package must trust:

- repository: `sanshan/event-driven-platform`;
- workflow file: `publish.yml`;
- environment: `npm-production`;
- allowed action: `npm publish`.

For the one-time bootstrap release in issue #54, the same Publish workflow temporarily receives a short-lived granular npm token through `NODE_AUTH_TOKEN` so it can create packages that do not yet exist on npm. After those packages exist and have Trusted Publishing configured, the temporary token is removed from GitHub, revoked in npm, and the workflow returns to OIDC-only publishing.

### Recovery

If production publishing is interrupted, do not create replacement versions. Fix the external failure and rerun the **Publish** workflow from the same release commit. Nx Release checks registry state and does not need repository-specific retry logic.

# Release process

This document is the repository-specific source of truth for preparing and publishing package releases.

It describes the release path that has been exercised end to end in this repository. When repository configuration and this document disagree, treat the repository configuration as authoritative and update this document.

## Release architecture

Release responsibilities are split between local Nx Release preparation and the production GitHub Actions publish workflow.

```text
Conventional commits
       |
       v
Nx Release versioning
       |
       +--> package versions
       +--> package changelogs
       +--> release commit
       +--> package-specific git tags
       |
       v
Push main + tags
       |
       v
GitHub Actions: Publish
       |
       v
nx release publish
       |
       v
npm via Trusted Publishing / OIDC
```

The repository does not use a custom release script.

## Configuration that defines release behavior

Review these files before changing release behavior:

- [`nx.json`](../../nx.json) — release project set, independent versioning, conventional commits, zero-major semver behavior, changelog generation, pre-version build and release commit message.
- [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) — production npm publication path.
- `packages/*/package.json` — package version, publishability, exports, files and package dependencies.
- `packages/*/CHANGELOG.md` — generated project changelogs.
- [`../execution-public-api.md`](../execution-public-api.md) and [`../read-public-api.md`](../read-public-api.md) — reviewed consumer-facing package boundaries.

## Current release model

Nx Release is configured for `packages/*` with independent project versioning.

Version eligibility is derived from git history using Conventional Commits. Current versions are resolved from package-specific tags using the form:

```text
{projectName}@{version}
```

For example:

```text
@event-driven-platform/clock@0.0.3
```

The repository has `adjustSemverBumpsForZeroMajorVersion: true`. During the validated release, `feat(clock): add FixedClock` was resolved as a `minor` Conventional Commit change but advanced `clock` from `0.0.2` to `0.0.3` because the package is still below `1.0.0`.

Independent versioning does not mean only the directly changed package can receive a new version. Nx also bumps dependent packages when their dependency metadata must advance. In the validated release, changing `clock` caused these releases:

```text
@event-driven-platform/clock                            0.0.2 -> 0.0.3
@event-driven-platform/operation-event-envelope-factory 0.0.2 -> 0.0.3
@event-driven-platform/outbox                           0.0.2 -> 0.0.3
@event-driven-platform/outbox-store                     0.0.2 -> 0.0.3
@event-driven-platform/runner                           0.0.2 -> 0.0.3
```

The dependent packages received changelog entries under `Updated Dependencies`.

## Publishable and internal packages

Nx version calculation evaluates the configured `packages/*` release project set, but publication intent is package-local. A package is publishable only when its current manifest permits publication and its public boundary has been reviewed.

An earlier validated publish dry-run predated the Read release boundary. At that time `read` and `query` were internal and were correctly omitted from publication. That historical result must not be treated as the current package set.

The current Read public boundary is defined in [`../read-public-api.md`](../read-public-api.md) and includes:

```text
@event-driven-platform/read
@event-driven-platform/query
@event-driven-platform/read-handler
@event-driven-platform/read-handler-resolver
@event-driven-platform/reader
@event-driven-platform/read-execution-coordinator
@event-driven-platform/read-cache-in-memory
@event-driven-platform/read-cache-redis
@event-driven-platform/read-execution-coordinator-redis
```

Other workspace packages remain internal when their current `package.json` keeps `private: true`, even if they participate in Nx Release version calculation.

Do not assume a package is safe to publish solely because it exists under `packages/*` or receives an Nx version. Check its current manifest and the applicable reviewed public boundary.

## Prerequisites

Before starting a release:

1. Work from `main`.
2. Ensure `main` is up to date with `origin/main`.
3. Ensure the working tree is clean.
4. Install dependencies from the lockfile.
5. Ensure the repository has the relevant release tags locally.
6. Do not start production publication until the release commit and tags have been reviewed and pushed.

The validated preparation started with:

```bash
git checkout main
git pull
pnpm install --frozen-lockfile
```

## 1. Preview release eligibility and versions

Always start with a dry-run:

```bash
pnpm nx release --dry-run
```

Review:

- which packages Nx considers releasable;
- current versions resolved from git tags;
- Conventional Commit specifiers;
- proposed versions;
- dependency-driven bumps;
- generated changelog previews;
- whether the result matches the intended change.

A dry-run must make no repository changes.

A successful dry-run may also report no release changes. This is a valid result. The validated no-op path confirmed that documentation-only repository changes did not create unintended package releases.

Do not proceed when the proposed package set or versions are unexpected.

## 2. Create the release commit and tags without publishing

After reviewing the dry-run:

```bash
pnpm nx release --skip-publish
```

This is not a dry-run. In the validated release it:

- updated versions in the affected package manifests;
- updated `pnpm-lock.yaml` where required;
- generated project changelog entries;
- created one release commit using `chore(release): publish`;
- created package-specific git tags;
- skipped npm publication.

Before pushing anything, inspect the result:

```bash
git status
git log -1 --oneline --decorate
git tag --points-at HEAD
git show --stat --oneline HEAD
```

Expected state:

- the working tree is clean;
- `main` is ahead of `origin/main` by the release commit;
- only intended versions/changelogs and required lockfile changes are present;
- the expected package-specific tags point at the release commit.

If the review is not correct, stop before pushing. Do not publish or push release tags until the discrepancy is understood.

## 3. Push the reviewed release commit and tags

After the release commit and tags have been reviewed:

```bash
git push origin main
git push origin --tags
```

Verify that the release commit and expected tags exist on GitHub before publication.

Do not rewrite shared release tags after they have been pushed.

## 4. Preview the publish phase

Before production publication:

```bash
pnpm nx release publish --dry-run
```

This previews the publish targets without publishing anything.

The validated dry-run ran `nx-release-publish` for all publishable projects at that point in repository history, not only packages receiving a new version. This behavior should be rechecked from current Nx output whenever the publishable set changes.

The real publish path safely handled already-published package versions and published only versions that were new.

## 5. Inspect package artifacts

Build the package projects using the repository's Nx targets:

```bash
pnpm nx run-many -t build --projects='packages/*'
```

Inspect representative changed publishable packages before the production publish:

```bash
cd packages/<package>
npm pack --dry-run
```

Confirm that each inspected tarball contains the expected consumer artifact:

- compiled JavaScript;
- TypeScript declarations;
- `package.json`;
- files allowed by the package manifest;
- no tests, source-only files or repository-only configuration unless intentionally included.

The validated `@event-driven-platform/clock@0.0.3` tarball contained the compiled `FixedClock`, declarations, and package metadata and excluded `src/` and tests.

In addition, CI verifies current publishable artifacts through the repository's local Nx Release + Verdaccio path. An isolated consumer installs published package artifacts, typechecks with no workspace resolution, and executes representative write and read compositions. Redis-backed Read composition is included when the affected Read graph requires the Redis service.

## 6. Trusted Publishing prerequisites

Production publication uses npm Trusted Publishing / GitHub OIDC rather than a long-lived `NPM_TOKEN`.

The current GitHub workflow requires:

```text
Repository: sanshan/event-driven-platform
Workflow:   publish.yml
Environment: npm-production
```

The npm Trusted Publisher configuration for each publishable package must match that identity.

`.github/workflows/publish.yml` grants `id-token: write`, uses the `npm-production` GitHub Environment and installs an npm version with Trusted Publishing support.

Do not add a long-lived npm token while this is the intended publication mechanism.

## 7. Run the production Publish workflow

Production publication is intentionally manual.

In GitHub Actions:

1. Open the `Publish` workflow.
2. Choose `Run workflow`.
3. Run it against `main`.

The workflow enforces `main`, checks out full git history, installs the repository's configured pnpm/Node/npm toolchain, builds package projects and runs:

```bash
pnpm nx release publish
```

Do not run the production workflow before the release commit and tags have been pushed and reviewed.

## 8. Verify publication

After the workflow succeeds, verify the intended versions on npm.

Then test at least one representative changed package from a clean project outside this monorepo so the test cannot resolve workspace or Verdaccio packages:

```bash
cd /tmp
rm -rf event-driven-platform-release-test
mkdir event-driven-platform-release-test
cd event-driven-platform-release-test

pnpm init
pnpm add @event-driven-platform/<package>@<version>
```

Import and exercise the released public API with Node or the appropriate consumer toolchain.

The validated release installed `@event-driven-platform/clock@0.0.3` from npm and successfully executed both `FixedClock` and `SystemClock` from a clean external project.

Local Verdaccio verification is a pre-publication artifact check; it does not replace this post-publication npm check.

## Failure and recovery checkpoints

Use the process checkpoints to avoid turning a recoverable preparation problem into a published release problem.

### Dry-run reports no changes

This is valid when there are no releasable Conventional Commit changes since the current package tags. Do not force a release merely because the command produced no versions.

### Dry-run proposes unexpected versions or packages

Stop. Inspect the git history, package dependency graph, current tags and `nx.json` before versioning.

### Version preparation is wrong before push

Do not push the release commit or tags. Determine the cause before continuing. Do not create a custom rollback mechanism as part of normal release operation.

### Failure after release commit/tags are pushed but before npm publication

Do not rewrite shared release history or tags as an automatic recovery action. Fix the publication problem and use the existing Nx/npm mechanisms to determine what remains unpublished.

### Publish is retried

The validated production publish path evaluated all publishable projects and tolerated versions already present in npm, publishing only new versions. Verify the registry state before assuming a retry needs a new version.

### npm version was published

Published npm versions are immutable release history. Do not attempt to reuse or rewrite the same version for different contents.

## Agent rules for release work

When an agent is asked to prepare or perform a release in this repository:

- read this document and the current `nx.json` and `.github/workflows/publish.yml` first;
- never skip the release dry-run;
- never infer version bumps from memory when Nx can calculate them;
- review dependency-driven bumps, not only directly changed packages;
- do not manually edit versions, changelogs or release tags when Nx Release owns those operations;
- do not publish incomplete/private packages to test the mechanism;
- stop before any irreversible step when observed behavior differs from this document;
- prefer current Nx, npm, pnpm and GitHub mechanisms over custom release automation.

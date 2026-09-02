# Release process

This document is the repository-specific source of truth for preparing and publishing package releases. Repository configuration is authoritative when it differs from this document.

## Release architecture

Public packages are independently versioned with Nx Release. Version plans committed with product changes define the intended package bumps and changelog text; Nx still propagates required dependency bumps through the project graph.

```text
Change PR + Nx version plan
            |
            v
Pull-request CI: nx release plan:check
            |
            v
GitHub Actions: Prepare Release
            |
            +--> package versions and dependency updates
            +--> package changelogs
            +--> release/next branch and release PR
            |
            v
Merge release PR
            |
            v
GitHub Actions: Finalize Release
            |
            +--> package-specific git tags
            |
            v
GitHub Actions: Publish
            |
            v
npm via Trusted Publishing / OIDC
```

Release preparation, tag finalization and npm publication are separate checkpoints. A package is never published directly from an unreviewed preparation branch.

## Configuration that defines release behavior

Review these files before changing release behavior:

- [`nx.json`](../../nx.json) — release project set, independent versioning, version plans, zero-major semver behavior, changelog generation and the pre-version build.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — version-plan coverage and affected-project validation.
- [`.github/workflows/prepare-release.yml`](../../.github/workflows/prepare-release.yml) — release calculation and release-PR creation.
- [`.github/workflows/finalize-release.yml`](../../.github/workflows/finalize-release.yml) — post-merge tag creation.
- [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) — production npm publication.
- `packages/*/package.json` and `packages/*/CHANGELOG.md` — Nx-managed versions, dependencies and changelogs.

## Repository prerequisite

The `Prepare Release` workflow uses its scoped `GITHUB_TOKEN` to open the release PR. The repository must enable:

```text
Settings > Actions > General > Workflow permissions
Allow GitHub Actions to create and approve pull requests
```

The workflow itself grants only `contents: write` and `pull-requests: write`. If the repository-level option is disabled, branch creation can succeed but GitHub rejects PR creation. Enable the option once before running the workflow; the workflow prints the same setting path if GitHub rejects the operation.

## 1. Add a version plan to each change PR

Changes that touch releasable packages must include an Nx version plan. Create one with the official Nx command:

```bash
pnpm nx release plan
```

Version plan files live in `.nx/version-plans/`. Each file records explicit semver bumps for the directly changed packages and contains the consumer-facing changelog text. For independently versioned packages, name every package whose public contract is affected.

Example:

```md
---
'@event-driven-platform/observability': major
'@event-driven-platform/use-case': major
'@event-driven-platform/use-case-executor': major
---

Expose the stable UseCase name in execution and observability contracts.
```

Use `major` for a breaking change even while a package is below `1.0.0`. With `adjustSemverBumpsForZeroMajorVersion: true`, Nx translates that intent to the repository's zero-major version progression.

Pull-request CI runs:

```bash
pnpm nx release plan:check
```

The check compares directly touched package projects with committed plans and fails when a required plan is missing. Release PRs are excluded because applying a plan intentionally deletes it while updating the package manifests and changelogs.

## 2. Prepare the release PR

From GitHub Actions, run `Prepare Release` against `main`.

The workflow:

1. requires `main` and rejects an already-open `release/next` PR;
2. installs the locked toolchain and dependencies;
3. runs `pnpm nx release --dry-run --skip-publish`;
4. runs `pnpm nx release --skip-publish` to apply version plans;
5. records the prepared base SHA and expected package tags in `.github/release-state.json`;
6. removes the local tags so no release tag exists before review;
7. pushes `release/next` and opens the release PR automatically.

When Nx finds no pending version plans, the workflow records a no-op and does not create a PR.

## 3. Review and merge the release PR

Review the generated PR like any other code change. Confirm:

- each directly changed package received the planned version;
- dependency-driven package bumps are expected;
- changelog text is consumer-facing and contains no commit or file-list metadata;
- `.github/release-state.json` lists the intended package tags;
- the working release diff contains only generated release changes and release state.

Do not manually repair generated versions or changelogs in the release PR. Fix the source version plan or release configuration, close the invalid release PR and run preparation again.

Merge the release PR only after CI succeeds.

## 4. Finalize package tags

Merging the `release/next` PR triggers `Finalize Release`. It validates the merged release state and creates the recorded package-specific tags on the merge commit.

Verify that the workflow succeeded before publication. Do not create, move or rewrite shared release tags manually.

## 5. Publish packages

Production publication is intentionally manual. In GitHub Actions, run `Publish` against `main` only after `Finalize Release` succeeds.

The workflow validates the release state and tags, builds all package projects and runs:

```bash
pnpm nx release publish
```

Publication uses the `npm-production` GitHub Environment and npm Trusted Publishing/OIDC. Do not add a long-lived `NPM_TOKEN` while this is the intended mechanism.

## 6. Verify publication

Verify the intended versions on npm, then install and exercise at least one representative changed package from a clean project outside this monorepo. Local Verdaccio verification in CI validates package artifacts before publication but does not replace the post-publication npm check.

## Failure and recovery checkpoints

### Prepare Release reports no changes

This is valid when there are no pending version plans. Do not force a release merely because no versions were produced.

### A plan is missing or proposes the wrong bump

Update the change PR's version plan. Do not rely on Conventional Commit scope inference or manually edit generated release output.

### Release PR creation is rejected

Enable the repository workflow-permission option documented above, close any incomplete release PR if one exists, and rerun `Prepare Release`. The workflow safely replaces the existing `release/next` branch only when no release PR is open.

### A generated release PR is wrong

Close it without merging, fix the version plan or configuration on `main`, and rerun preparation. Package tags do not exist yet, so this remains a recoverable checkpoint.

### Finalization or publication fails

Do not rewrite merged release history or shared tags automatically. Fix the failing workflow or registry prerequisite, verify the current tag and npm state, then retry the failed phase.

Published npm versions are immutable and must never be reused for different contents.

## Agent rules for release work

When an agent is asked to prepare or perform a release in this repository:

- read this document and the current release workflows first;
- ensure package changes include explicit version plans;
- never skip the release dry-run;
- review dependency-driven bumps, not only directly planned packages;
- do not manually edit versions, changelogs or release tags owned by Nx Release;
- stop before an irreversible step when observed behavior differs from this document;
- prefer current Nx, pnpm, npm and GitHub mechanisms over custom release automation.

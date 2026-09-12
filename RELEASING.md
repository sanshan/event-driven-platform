# Releasing

The canonical repository release process is documented in [`docs/release/README.md`](docs/release/README.md).

Do not maintain a second detailed release procedure in this root file. When release behavior, repository configuration, workflows, and documentation disagree, treat the current repository configuration and the canonical release document as authoritative and correct the documentation instead of inventing an alternate flow.

## Current flow at a glance

1. A change PR that touches a releasable package includes an explicit Nx version plan under `.nx/version-plans/`.
2. Pull-request CI verifies plan coverage with `pnpm nx release plan:check` and runs the normal affected-project/package verification.
3. After the change PR is merged to `main`, run **Prepare Release** from GitHub Actions.
4. **Prepare Release** applies pending version plans with Nx Release, pushes `release/next`, and opens the reviewable release PR.
5. Merge the release PR only after its CI succeeds. **Finalize Release** then creates the prepared package tags.
6. After finalization succeeds, manually run **Publish** from `main` and approve the `npm-production` environment when required.

Nx Release owns package versions, dependency-driven bumps, changelogs, and package tags. Do not manually calculate or edit those generated release outputs.

For the complete procedure, failure recovery, package verification, and publishing rules, read [`docs/release/README.md`](docs/release/README.md) before performing release work.

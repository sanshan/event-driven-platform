# pnpm

pnpm is used as the package manager for the monorepo.

Use pnpm for:

* dependency management
* workspace management
* fast installation
* efficient disk usage
* strict dependency isolation

pnpm must be treated as a build and dependency tool.

## Monorepo workspaces

pnpm workspaces organize packages.

Structure:

* packages in separate directories
* shared package.json dependencies
* workspace.yaml or pnpm-workspace.yaml
* consistent versioning

Workspace dependencies should be explicit.

## Version management

Keep dependencies aligned.

Practices:

* consistent versions across workspace
* use workspace:* protocol for internal packages
* pin major versions where stability matters
* keep dependency tree shallow

## Dependency resolution

pnpm resolves dependencies strictly.

Features:

* peer dependency validation
* strict dependency isolation
* no phantom dependencies
* clear dependency visibility

Avoid:

* missing declared dependencies
* accidental peer dependency access
* implicit transitive dependencies

## Lock file management

Maintain reliable builds.

Practices:

* commit pnpm-lock.yaml
* use lockfile-only installs
* keep lock file up to date
* avoid lock file conflicts

Lock files ensure reproducible builds.

## Performance

Optimize installation and builds:

* use pnpm i -D instead of unnecessary installs
* leverage pnpm's fast algorithms
* use --filter for focused operations
* use workspace links for local development

## Scripts and commands

Use pnpm for task execution:

* pnpm install
* pnpm add
* pnpm remove
* pnpm update
* pnpm run <script>

Task consistency across workspace.

## Peer dependencies

Handle peer dependencies explicitly.

Practices:

* declare peer dependencies clearly
* specify peer ranges carefully
* avoid conflicting peer dependencies
* validate during installation

Peer dependency conflicts should be resolvable.

## Development dependencies

Separate concerns.

Use:

* devDependencies for build tools
* dependencies for runtime
* peerDependencies for framework requirements

Minimize bloat in node_modules.

## CI/CD integration

pnpm in CI:

* use frozen-lockfile mode
* cache .pnpm-store
* parallel installation when possible
* consistent pnpm version

## Workspace filtering

Use pnpm filters:

* --filter <package-name>
* --filter ./packages/<pattern>
* --recursive

Filter for focused operations.

## Publishing

Manage package publishing:

* version consistency
* changelog tracking
* tag management
* registry configuration

## Troubleshooting

Common issues:

* peer dependency conflicts
* lock file divergence
* node_modules pollution
* version mismatches

Maintain clean workspaces.

## Agent rules

When working with pnpm:

* use workspace protocol for internal packages
* declare all dependencies explicitly
* manage peer dependencies carefully
* keep lock file committed
* use filters for focused operations
* optimize for fast installation
* validate dependency resolution
* maintain consistent versions
* support CI/CD efficiency
* design for scalable workspaces


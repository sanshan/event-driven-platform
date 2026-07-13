# Nx Library Generation

All TypeScript packages must be generated using the `@nx/js:library` generator.

Packages must not be created manually.

Every generated package must use:

- TypeScript
- strict TypeScript mode
- ESLint
- Vitest
- explicit import path
- project-level Nx configuration
- package-level `package.json`

Two package types are supported:

- buildable package
- non-buildable package

## Naming

Package directory:

```txt
packages/<package-name>
```

Package import path:

```txt
@event-driven-platform/<package-name>
```

Example:

```txt
Directory:
packages/retry

Import path:
@event-driven-platform/retry
```

## Buildable Package

A buildable package has its own Nx `build` target.

It is compiled independently using TypeScript.

Buildable packages are used when the package:

- must produce its own `dist` output
- may be consumed outside the workspace
- represents a stable architectural boundary
- is intended to be independently compiled
- may later become publishable
- is required as a buildable dependency of another buildable package

Canonical command:

```bash
pnpm nx g @nx/js:library packages/<package-name> \
  --bundler=tsc \
  --unitTestRunner=vitest \
  --linter=eslint \
  --importPath=@event-driven-platform/<package-name> \
  --strict=true \
  --useProjectJson=true
```

Example:

```bash
pnpm nx g @nx/js:library packages/retry \
  --bundler=tsc \
  --unitTestRunner=vitest \
  --linter=eslint \
  --importPath=@event-driven-platform/retry \
  --strict=true \
  --useProjectJson=true
```

The generated package must have a build target using:

```txt
@nx/js:tsc
```

The package can be built independently:

```bash
pnpm nx build retry
```

## Non-Buildable Package

A non-buildable package does not have its own Nx `build` target.

Its source code is compiled as part of the application or buildable package that consumes it.

Non-buildable packages are used when the package:

- is used only inside the workspace
- does not require independent build output
- is not published independently
- is an internal implementation detail
- does not need an isolated compilation boundary

Canonical command:

```bash
pnpm nx g @nx/js:library packages/<package-name> \
  --bundler=none \
  --unitTestRunner=vitest \
  --linter=eslint \
  --importPath=@event-driven-platform/<package-name> \
  --strict=true \
  --useProjectJson=true
```

Example:

```bash
pnpm nx g @nx/js:library packages/retry \
  --bundler=none \
  --unitTestRunner=vitest \
  --linter=eslint \
  --importPath=@event-driven-platform/retry \
  --strict=true \
  --useProjectJson=true
```

The generated package must not have an independent build target.

It must still support:

```bash
pnpm nx lint retry
```

and:

```bash
pnpm nx test retry
```

## Required Options

### `--bundler=tsc`

Creates a buildable TypeScript package.

Nx configures an independent build target using the `@nx/js:tsc` executor.

### `--bundler=none`

Creates a non-buildable TypeScript package.

Nx does not configure an independent build target.

### `--unitTestRunner=vitest`

Configures Vitest as the package unit test runner.

All packages use the same testing framework.

### `--linter=eslint`

Configures ESLint for the package.

Linting must never be disabled for generated packages.

ESLint is responsible for:

- static code analysis
- consistent code rules
- detecting invalid imports
- enforcing Nx module boundaries

The following option is forbidden:

```bash
--linter=none
```

### `--importPath`

Defines the public package import path.

Internal imports must use the package name:

```ts
import { RetryOptions } from '@event-driven-platform/retry';
```

Imports must not reach into another package through relative filesystem paths:

```ts
// Forbidden
import { RetryOptions } from '../../retry/src/lib/retry-options.js';
```

### `--strict=true`

Enables strict TypeScript checking for the generated package.

Strict mode must always be enabled.

The following option is forbidden:

```bash
--strict=false
```

### `--useProjectJson=true`

Stores Nx project configuration in:

```txt
packages/<package-name>/project.json
```

Nx configuration must not be mixed into `package.json`.

`project.json` describes Nx targets and project metadata.

`package.json` describes the TypeScript package and its package-manager dependencies.

## Buildable vs Publishable

Buildable and publishable are different concepts.

A buildable package:

```txt
can be compiled independently
```

A publishable package:

```txt
is prepared for versioning and distribution through a package registry
```

Packages must not use:

```bash
--publishable
```

unless publishing through `nx release` or a package registry is explicitly required.

A package may be buildable without being publishable.

## Default Decision Rule

Use a buildable package when it represents a reusable platform-level contract, abstraction or architectural boundary.

Examples:

```txt
types
actor
subject
intent
operation
command
retry
```

Use a non-buildable package for implementation code that exists only as part of another application or feature.

Examples:

```txt
application-specific handlers
internal adapters
feature-specific utilities
service implementation details
```

When uncertain, do not choose based on package size.

Choose based on whether the package requires an independent compilation boundary.

## Verification

After generating a package, run:

```bash
pnpm nx show project <package-name>
pnpm nx lint <package-name>
pnpm nx test <package-name>
pnpm exec tsc --build
git status --short
```

For a buildable package, also run:

```bash
pnpm nx build <package-name>
```

A generated package is not considered ready until linting, tests and TypeScript compilation succeed.

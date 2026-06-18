# Nx

Nx is used as the monorepo build system and workspace orchestration platform.

Use Nx for:

* monorepo organization
* project boundaries
* dependency graph management
* task execution
* incremental builds
* caching
* affected detection
* code generation
* workspace tooling

Nx must be treated as a build and orchestration platform, not as an application architecture layer.

## Workspace structure

Prefer a modular workspace.

Organize code by responsibility and ownership.

Typical categories:

* applications
* domains
* features
* infrastructure
* contracts
* shared utilities
* tooling

Keep boundaries explicit.

Avoid large shared modules that become dependency hubs.

## Standalone mode

Use Nx Standalone workspace layout.

Prefer:

* project-level configuration
* explicit project ownership
* project-local build configuration

Avoid centralized workspace configuration when project-level configuration is more appropriate.

## Dependency graph

Nx dependency graph is the source of truth for project relationships.

All dependencies must flow intentionally.

Avoid:

* circular dependencies
* hidden runtime dependencies
* dependency shortcuts
* bypassing declared project boundaries

Projects should depend only on what they actually need.

## Project references

Use TypeScript Project References.

Benefits:

* incremental compilation
* faster builds
* explicit boundaries
* better dependency management

Every buildable library should define:

* tsconfig.json
* tsconfig.lib.json
* project references

Avoid bypassing references with path hacks.

## Library design

Libraries should have a single responsibility.

Prefer:

* small focused libraries
* explicit public APIs
* stable entry points

Avoid:

* god libraries
* large utility packages
* exposing internal implementation details

Libraries should expose only their public surface.

## Public APIs

Use index files as public package boundaries.

Import only through public entry points.

Prefer:

```ts
import { UserService } from '@platform/user';
```

Avoid:

```ts
import { UserService } from '@platform/user/src/internal/user.service';
```

Do not import internal implementation files across project boundaries.

## Tags and boundaries

Use Nx tags to enforce architecture boundaries.

Examples:

* scope:domain
* scope:feature
* scope:infrastructure
* scope:application

Examples:

* type:api
* type:domain
* type:contract
* type:infrastructure

Dependency rules should be enforced automatically.

Do not rely on manual review alone.

## Buildability

Buildable libraries should be independently buildable.

Each project should:

* compile independently
* declare dependencies explicitly
* avoid relying on build order accidents

Avoid hidden dependencies between projects.

## Caching

Use Nx caching aggressively.

Cache:

* builds
* tests
* linting
* code generation

Tasks should be deterministic.

Avoid tasks that produce different results from the same inputs.

## Affected commands

Prefer affected execution when possible.

Use:

* affected builds
* affected tests
* affected linting

Avoid rebuilding the entire repository when only a subset changed.

## Generators

Use Nx generators for repetitive project setup.

Generated code must still follow project architecture rules.

Do not blindly accept generated structures.

Review generated code before committing.

## Testing

Testing should respect project boundaries.

Prefer:

* unit tests near implementation
* integration tests near boundaries
* end-to-end tests at application level

Avoid coupling tests across unrelated projects.

## Build performance

For large repositories:

* keep dependency graph shallow
* avoid unnecessary dependencies
* avoid giant shared packages
* use project references
* use incremental builds
* use cacheable operations
* split large projects when needed

Build performance should scale with repository size.

## CI/CD

CI should leverage:

* Nx cache
* affected detection
* incremental builds

Avoid:

* full rebuilds for every change
* full test runs when not required
* duplicated pipeline work

## Package boundaries

Every package should have:

* clear ownership
* clear responsibility
* explicit public API

Avoid cross-package implementation access.

Package consumers should depend only on public contracts.

## Code generation

Generated code should be deterministic.

Generated artifacts should:

* be reproducible
* be reviewable
* follow workspace conventions

Do not generate hidden runtime behavior.

## Observability

Workspace tooling should make dependencies visible.

Prefer:

* dependency graph analysis
* affected reports
* boundary enforcement
* build diagnostics

Architecture violations should be discoverable early.

## High-scale monorepo rules

For large monorepos:

* keep dependency direction intentional
* prevent circular dependencies
* enforce project boundaries
* keep libraries focused
* avoid shared dumping-ground packages
* use project references
* use affected execution
* optimize cache usage
* review dependency graph regularly

Repository growth must not degrade developer productivity.

## Agent rules

When generating Nx code or configuration:

* preserve project boundaries
* use project references
* import through public APIs only
* avoid circular dependencies
* keep libraries focused
* use tags and boundary enforcement
* make projects independently buildable
* keep tasks deterministic
* leverage caching
* use affected execution where appropriate
* avoid hidden dependencies
* avoid cross-package internal imports
* keep dependency graph clean and intentional

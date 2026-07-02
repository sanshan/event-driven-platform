# TypeScript Project References

TypeScript Project References are used for incremental compilation and explicit package boundaries.

Use Project References for:

* incremental TypeScript compilation
* explicit dependency boundaries
* independent package building
* faster builds in monorepos
* clearer architecture

Project References must be treated as build and architecture infrastructure.

## Configuration

Every buildable package needs:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../other-package" }
  ]
}
```

## Composite projects

Enable composite mode:

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

Composite enables:

* incremental compilation
* declaration file generation
* source map generation

## Dependency declaration

Declare all dependencies explicitly:

```json
"references": [
  { "path": "../domain" },
  { "path": "../contracts" },
  { "path": "../infrastructure" }
]
```

Dependencies must flow through Project References.

## Build order

TypeScript resolves build order automatically.

Practices:

* declare references correctly
* avoid circular references
* let TypeScript manage compilation
* leverage incremental builds

Do not manually manage build order.

## Source maps

Enable for debugging:

```json
"compilerOptions": {
  "sourceMap": true,
  "declarationMap": true
}
```

Source maps support distributed debugging.

## Incremental compilation

Benefits:

* only changed files recompile
* dependencies compile independently
* faster local development
* faster CI builds

Incremental builds should improve significantly.

## IDE support

Project References improve IDE support:

* better error reporting
* accurate navigation
* faster type checking
* symbol highlighting

## Avoiding pitfalls

Do not:

* bypass Project References with path mappings
* import from non-public APIs
* create circular references
* ignore compilation errors

Project References enforce boundaries.

## Public APIs

Only export from index files:

Good:

```ts
export { UserService } from './user.service';
export { User } from './user.model';
```

Bad:

```ts
export * from './src/internal/...';
```

Keep public APIs explicit.

## Version coordination

Ensure consistency:

* single TypeScript version across workspace
* consistent tsconfig.base settings
* compatible module resolution

Version mismatches cause problems.

## Performance optimization

For large workspaces:

* use Project References aggressively
* enable composite mode
* enable incremental builds
* limit reference depth

Performance should scale with workspace growth.

## Validation

Ensure correctness:

* validate references in CI
* check for circular dependencies
* verify compilation success
* test cross-package imports

Violations should be detected early.

## Agent rules

When working with TypeScript Project References:

* declare all dependencies explicitly
* enable composite mode for buildable packages
* use declaration files for boundaries
* enable incremental compilation
* avoid circular dependencies
* import only from public APIs
* validate reference configuration
* support IDE features
* optimize for fast compilation
* enforce architecture boundaries
* do not bypass references with path mappings


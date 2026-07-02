# TypeScript

TypeScript is the primary programming language.

Use TypeScript for:

* backend services
* shared packages
* contracts
* infrastructure adapters
* application code
* tests
* tooling scripts

TypeScript must be used for type safety, explicit contracts and maintainable code.

## Strict mode

Use strict TypeScript.

Prefer:

* `strict: true`
* `noImplicitAny`
* `strictNullChecks`
* `noUncheckedIndexedAccess`
* `exactOptionalPropertyTypes`

Do not weaken compiler settings to make code pass.

Fix the types instead.

## Type safety

Avoid `any`.

Use `unknown` for untrusted values.

Narrow `unknown` before use.

Prefer explicit types at public boundaries.

Do not use unsafe casts to silence the compiler.

Bad:

```ts
const payload = data as UserPayload;
```

Better:

```ts
const payload = parseUserPayload(data);
```

## Runtime validation

TypeScript types exist only at compile time.

Validate external input at runtime.

Validate:

* HTTP request bodies
* message payloads
* environment variables
* external API responses
* database JSON fields
* file contents

Do not trust external data because it has a TypeScript type.

## Public APIs

Public functions should have clear input and output types.

Prefer explicit return types for:

* exported functions
* public class methods
* interface implementations
* package boundaries
* framework entry points

Internal helper functions may infer return types when inference is obvious.

## Domain types

Use precise types for important concepts.

Prefer:

* branded types
* readonly objects
* discriminated unions
* literal unions
* enums only when they are the best fit

Avoid primitive obsession for critical identifiers.

Example:

```ts
type UserId = string & { readonly brand: unique symbol };
```

## Discriminated unions

Use discriminated unions for result-like and state-like structures.

Prefer:

```ts
type Result =
  | { status: 'success'; value: string }
  | { status: 'rejected'; reason: string };
```

Avoid boolean flag combinations that allow impossible states.

## Null and undefined

Handle nullable values explicitly.

Avoid unnecessary optional fields.

Use:

* `null` for intentionally empty values
* `undefined` for omitted values

Do not mix `null` and `undefined` accidentally.

## Immutability

Prefer immutable data where practical.

Use:

* `readonly`
* `ReadonlyArray<T>`
* readonly object fields
* immutable updates

Avoid mutating shared state.

## Functions

Functions should be small and explicit.

Prefer:

* clear parameters
* clear return values
* no hidden side effects
* no mutation of input arguments

Avoid:

* boolean parameter traps
* large parameter lists
* functions that both compute and perform side effects

Use objects for complex parameters.

## Errors

Represent expected failures explicitly.

Use thrown exceptions for exceptional failures.

For expected outcomes, prefer result-like structures.

Avoid returning `null` for complex failure states.

## Async code

Always handle promises.

Avoid:

* floating promises
* unhandled rejections
* unnecessary async wrappers

Use `Promise.all` only when parallel execution is intentional.

Use bounded concurrency for large batches.

## Generics

Use generics when they improve type safety.

Avoid unnecessary generic abstractions.

Generic type names should be meaningful when the type is non-trivial.

Prefer:

```ts
function mapResult<TInput, TOutput>(input: TInput): TOutput
```

over unclear generic names in complex code.

## Type guards

Use type guards for runtime narrowing.

Prefer:

```ts
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null;
}
```

Do not use type guards that only pretend to validate.

A type guard must actually check the required structure.

## Exhaustiveness

Use exhaustive checks for discriminated unions.

Example:

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
```

Do not leave union branches unhandled.

## Imports and exports

Use explicit imports.

Avoid large barrel files when they create circular dependencies or unclear boundaries.

Prefer stable package-level exports.

Do not import from internal paths of another package unless explicitly allowed.

## Constants

Prefer `as const` for stable literal values.

Use `satisfies` when validating object shape without losing literal types.

Example:

```ts
const config = {
  retryAttempts: 3,
  timeoutMs: 1000,
} as const satisfies RuntimeConfig;
```

## Classes

Use classes when they represent behavior with dependencies or lifecycle.

Avoid classes for simple data structures.

Prefer plain objects for data.

Do not use inheritance when composition is clearer.

## Interfaces and types

Use `interface` for object shapes intended to be extended or implemented.

Use `type` for:

* unions
* intersections
* mapped types
* branded types
* utility compositions

Be consistent inside a package.

## Module boundaries

Keep boundaries explicit.

Do not leak infrastructure-specific types into core application or domain code.

Do not expose ORM models, transport DTOs or framework-specific types as generic shared types.

## Testing

Tests should be type-safe.

Avoid `as any` in tests unless testing invalid input intentionally.

Test public behavior, not private implementation details.

Use builders or factories for complex test data.

## Agent rules

When generating TypeScript code:

* keep `strict` TypeScript compatibility
* avoid `any`
* use `unknown` for untrusted input
* validate external data at runtime
* use explicit public API types
* prefer discriminated unions for state and result variants
* avoid impossible states
* handle nullable values explicitly
* avoid unsafe casts
* avoid mutating shared state
* handle promises explicitly
* use exhaustive checks for unions
* use `satisfies` where useful
* keep module boundaries clean
* do not leak infrastructure types across layers
* do not weaken compiler options

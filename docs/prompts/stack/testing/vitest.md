# Vitest

Vitest is the primary testing framework.

Use Vitest for:

- unit tests
- integration tests
- contract tests
- infrastructure tests
- utility tests
- application tests

Vitest must be treated as a testing tool, not as part of application logic.

## Testing philosophy

Tests must verify behavior.

Prefer testing:

- observable outcomes
- public APIs
- contracts
- business rules
- integration boundaries

Avoid testing:

- implementation details
- private methods
- internal framework behavior
- library internals

Tests should remain stable during refactoring.

## Test structure

Prefer:

- Arrange
- Act
- Assert

Structure tests clearly.

Each test should focus on a single behavior.

Avoid tests that validate multiple unrelated outcomes.

## Naming

Test names should describe behavior.

Prefer:

```ts id="pxzgdy"
it('returns cached user when cache contains value');
```

```ts id="6ymv4z"
it('rejects duplicate intent execution');
```

Avoid:

```ts id="5mt7ye"
it('works');
```

```ts id="22egyu"
it('test user service');
```

Test names should explain expected behavior.

## Unit tests

Unit tests should:

- run fast
- be deterministic
- have no external dependencies
- execute in isolation

Mock only true external dependencies.

Avoid mocking internal implementation unnecessarily.

## Integration tests

Integration tests should verify collaboration between components.

Examples:

- database integration
- cache integration
- messaging integration
- API integration

Integration tests may use real infrastructure.

Prefer realistic environments.

## Contract tests

Use contract tests for:

- API contracts
- event contracts
- schema validation
- message contracts

Contracts should be verified automatically.

Contract failures should be detected early.

## Test isolation

Tests must not depend on:

- execution order
- shared mutable state
- previous tests
- external timing assumptions

Every test should be runnable independently.

## Determinism

Tests must be deterministic.

Avoid:

- random behavior
- real clock dependence
- race-sensitive assertions
- sleep-based synchronization

Control:

- time
- randomness
- external dependencies

## Async testing

Handle async behavior explicitly.

Always await asynchronous operations.

Avoid:

```text
service.execute();
expect(...)
```

Prefer:

```text
await service.execute();
expect(...)
```

Do not leave unresolved promises.

## Assertions

Prefer specific assertions.

Good:

```ts id="u56a0u"
expect(result.status).toBe('success');
```

Avoid:

```ts id="e7d7lm"
expect(result).toBeTruthy();
```

Assertions should clearly communicate expectations.

## Mocking

Mock only external dependencies.

Examples:

- external APIs
- databases in unit tests
- message brokers in unit tests
- filesystem access
- network access

Avoid excessive mocking.

Do not mock behavior that should be tested.

## Test doubles

Use:

- mocks
- stubs
- spies
- fakes

Choose the simplest test double that satisfies the test.

Avoid over-engineered mocks.

## Fixtures

Keep fixtures explicit.

Prefer:

- builders
- factories
- reusable test helpers

Avoid:

- massive fixture objects
- hidden fixture behavior
- shared mutable fixtures

Fixtures should be easy to understand.

## Data builders

Prefer builders for complex test objects.

Example:

```ts id="z1yyof"
const user = UserBuilder.create().withStatus('ACTIVE').build();
```

Builders improve readability and reduce duplication.

## Snapshots

Use snapshots carefully.

Good use cases:

- generated output
- structured serialization
- contract verification

Avoid snapshots for:

- business behavior
- frequently changing structures
- complex domain logic

Snapshots should remain reviewable.

## Time

Control time explicitly.

Use fake timers when needed.

Avoid:

- waiting with setTimeout
- sleep-based assertions
- real clock dependence

Tests should execute quickly.

## Error testing

Verify failures explicitly.

Example:

```ts id="dfy5ae"
await expect(service.execute()).rejects.toThrow();
```

Test expected failures as carefully as successful paths.

## Coverage

Coverage is a signal, not a goal.

High coverage does not guarantee correctness.

Prefer meaningful tests over coverage inflation.

Do not write tests solely to increase coverage numbers.

## Database testing

For database integration tests:

- use isolated databases
- use migrations
- reset state between tests
- avoid shared data

Database tests should be reproducible.

## Messaging testing

Verify:

- message production
- message consumption
- retry behavior
- idempotency behavior
- dead-letter behavior

Messaging tests should cover failure scenarios.

## Concurrency testing

Test concurrency-sensitive behavior.

Examples:

- duplicate requests
- idempotency
- race conditions
- locking
- optimistic concurrency

High-load systems require concurrency validation.

## Performance

Tests should remain fast.

Avoid:

- unnecessary infrastructure startup
- redundant setup
- large datasets
- excessive waiting

Slow tests reduce developer productivity.

## Parallel execution

Tests should support parallel execution.

Avoid:

- shared state
- global mutations
- port conflicts
- shared files

Parallel-safe tests scale better.

## Maintainability

Tests are production code.

Apply the same standards:

- readability
- refactoring
- consistency
- explicitness

Poor-quality tests reduce confidence.

## Agent rules

When generating Vitest tests:

- test behavior, not implementation
- use Arrange-Act-Assert structure
- write descriptive test names
- keep tests deterministic
- control time explicitly
- await asynchronous operations
- use specific assertions
- mock only external dependencies
- prefer builders for complex fixtures
- test failure scenarios
- test concurrency-sensitive behavior
- keep tests isolated
- support parallel execution
- optimize for readability and maintainability

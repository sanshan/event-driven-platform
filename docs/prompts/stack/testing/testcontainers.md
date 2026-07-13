# Testcontainers

Testcontainers is used for managing Docker containers in integration tests.

Use Testcontainers for:

- database testing
- message broker testing
- cache testing
- service containers
- integration testing

Testcontainers must be treated as testing infrastructure.

## Container management

Use containers for:

- isolated test environments
- realistic infrastructure simulation
- database state management
- integration verification

Containers should match production systems.

## Database containers

Prefer:

- PostgreSQL containers for database tests
- version matching production
- automatic schema migrations
- cleanup between tests

Avoid:

- in-memory databases for database-specific behavior
- assumptions about test isolation
- leaving containers running

## Messaging containers

Use:

- Redpanda containers for messaging tests
- Kafka containers when needed
- topic creation
- schema registry simulation

## Cache containers

Test with:

- Redis containers
- real cache behavior
- expiration testing
- data structure testing

## Test lifecycle

Manage containers explicitly:

- start containers before tests
- stop containers after tests
- reuse containers when safe
- clean state between tests

## Performance

Optimize test execution:

- reuse container instances where possible
- batch container startup
- minimize test isolation overhead
- profile container startup time

## Dependencies

Containers should represent:

- actual service dependencies
- real version constraints
- production-like configuration

Match production behavior closely.

## Concurrency

Handle concurrent test execution:

- isolate container state
- use port management
- avoid port conflicts
- support parallel tests

## Health checks

Wait for container readiness:

- database connection verification
- broker connectivity
- cache availability

Do not assume immediate readiness.

## Cleanup

Always cleanup:

- stop containers
- remove volumes
- release ports
- flush resources

Resource leaks should be prevented.

## Configuration

Configure containers appropriately:

- environment variables
- exposed ports
- volume mounts
- network settings

Match integration requirements.

## Agent rules

When generating Testcontainers code:

- use containers for infrastructure integration tests
- match production system versions
- manage container lifecycle explicitly
- wait for container readiness
- isolate test state
- cleanup resources
- handle concurrent test execution
- avoid unnecessary container overhead
- keep tests deterministic
- make failures observable

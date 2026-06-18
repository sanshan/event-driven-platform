# NestJS

NestJS is used as the main backend framework for Node.js services.

Use NestJS for:

* HTTP APIs
* gRPC APIs
* message consumers
* cron jobs
* application modules
* dependency injection
* validation
* configuration
* lifecycle hooks
* observability integration
* testing modules

NestJS must be treated as an application framework, not as a domain model.

## General rules

Prefer explicit, modular and testable NestJS code.

Use:

* modules
* providers
* controllers
* guards
* interceptors
* pipes
* filters
* lifecycle hooks
* dependency injection

Avoid:

* global mutable state
* hidden dependencies
* business logic inside controllers
* infrastructure logic inside domain code
* large god services
* circular module dependencies

## Modules

Use modules to group related application and infrastructure concerns.

Prefer small modules with clear boundaries.

Each module should expose only what other modules actually need.

Avoid exporting everything by default.

Do not create circular dependencies between modules.

Use `forwardRef` only as a last resort.

## Providers

Use providers for reusable application services, infrastructure adapters and framework integrations.

Prefer constructor injection.

Avoid service locator patterns.

Do not instantiate dependencies manually with `new` when they should be injected by NestJS.

## Controllers

Controllers should be thin.

Controllers may:

* receive requests
* validate input
* map request DTOs
* call application services
* return response DTOs

Controllers must not contain:

* business rules
* transaction orchestration
* database queries
* message publishing logic
* retry logic
* cache orchestration

## DTOs

Use DTOs for external boundaries.

Use validation decorators where appropriate.

Keep request DTOs and response DTOs explicit.

Do not expose database models directly as API responses.

Do not reuse persistence models as transport DTOs.

## Validation

Validate external input at boundaries.

Use:

* pipes
* DTO validation
* explicit transformation where needed

Do not trust incoming HTTP, gRPC or message payloads.

Validation must happen before data enters application logic.

## Configuration

Use explicit configuration modules.

Validate environment variables at startup.

Do not read `process.env` directly across application code.

Prefer typed configuration objects.

Fail fast when required configuration is missing.

## Error handling

Use explicit error handling.

Map internal errors to external responses at boundaries.

Use exception filters when needed.

Do not leak internal implementation details in public API errors.

Do not swallow errors silently.

## Interceptors

Use interceptors for cross-cutting concerns.

Good use cases:

* logging
* tracing
* metrics
* response mapping
* timeout handling

Do not put business logic into interceptors.

## Guards

Use guards for access decisions and request authorization.

Do not use guards for business workflow decisions.

Keep guards focused on boundary-level access checks.

## Pipes

Use pipes for validation and transformation.

Do not use pipes for database access or business logic.

## Lifecycle hooks

Use lifecycle hooks for infrastructure startup and shutdown behavior.

Examples:

* connecting consumers
* closing connections
* flushing telemetry
* graceful shutdown

Keep lifecycle behavior deterministic and observable.

## Async behavior

Handle asynchronous code explicitly.

Always await promises when required.

Do not fire-and-forget critical work.

If background execution is required, use an explicit queue, consumer, scheduler or runner abstraction.

## Transactions

Do not hide transaction boundaries inside random services.

Transaction orchestration should be explicit and testable.

Do not perform external network calls inside database transactions.

Keep transactions short.

## Messaging

NestJS message consumers should be treated as application entry points.

Consumers may:

* receive messages
* validate message payloads
* map messages to application calls
* handle acknowledgements according to transport rules

Consumers must not contain core business logic.

## Observability

NestJS services should expose useful observability.

Prefer:

* structured logging
* request correlation
* tracing
* metrics
* health checks
* readiness checks
* graceful shutdown logs

Do not use console logging in production code.

## Testing

Use NestJS testing utilities for module-level tests.

Prefer:

* unit tests for providers
* integration tests for module boundaries
* e2e tests for APIs when needed
* test doubles for external dependencies

Avoid tests that require full infrastructure unless they are integration or e2e tests.

## High-load rules

For high-load services:

* keep controllers thin
* avoid blocking the event loop
* avoid unbounded in-memory queues
* avoid loading large datasets into memory
* use pagination for list endpoints
* validate payload sizes
* apply timeouts for external calls
* expose health and readiness checks
* handle graceful shutdown
* avoid request-scoped providers unless necessary

## Agent rules

When generating NestJS code:

* use modules, providers and dependency injection
* keep controllers thin
* keep DTOs explicit
* validate external input
* do not expose database models directly
* do not put business logic in controllers, guards, pipes or interceptors
* avoid circular dependencies
* avoid `forwardRef` unless there is no better option
* validate environment configuration at startup
* keep transaction boundaries explicit
* do not perform external calls inside transactions
* use structured logging
* add tests for public provider behavior
* keep framework concerns outside domain code

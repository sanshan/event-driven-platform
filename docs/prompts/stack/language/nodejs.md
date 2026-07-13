# Node.js

Node.js is the runtime platform for backend services.

Use Node.js for:

- service runtime
- asynchronous I/O
- HTTP servers
- background workers
- message consumers
- CLI tooling
- process lifecycle management

Node.js must be treated as a runtime platform, not as an application architecture layer.

## Event loop

Do not block the event loop.

Avoid:

- synchronous filesystem operations in hot paths
- CPU-intensive computations in request paths
- large synchronous JSON processing
- long-running synchronous loops
- synchronous compression or cryptography in hot paths

For CPU-intensive workloads, use:

- worker threads
- queues
- dedicated worker services

## Async operations

Always handle promise rejections.

Always await critical promises.

Avoid fire-and-forget execution for important operations.

Use:

- timeouts
- cancellation via AbortController
- explicit retry policies
- bounded concurrency

Do not assume external systems will respond quickly or successfully.

## Concurrency

Control concurrency explicitly.

Avoid:

- unlimited Promise.all usage
- unbounded parallel processing
- unbounded consumer throughput

Use concurrency limits for:

- database operations
- external API calls
- message processing
- batch jobs

Concurrency must respect downstream system capacity.

## Process lifecycle

Support graceful shutdown.

Handle:

- SIGTERM
- SIGINT

During shutdown:

- stop accepting new work
- complete in-flight work where appropriate
- close database pools
- disconnect consumers
- flush telemetry
- release resources

Do not rely on abrupt process termination.

## Memory management

Design for bounded memory usage.

Avoid:

- unbounded arrays
- unbounded maps
- unbounded caches
- loading large datasets into memory
- buffering large files completely

Prefer:

- streaming
- batching
- pagination
- bounded caches

Monitor memory growth continuously.

## Streams

Use streams for large data processing.

Prefer streams for:

- file processing
- large exports
- large imports
- network transfers

Respect backpressure.

Handle stream errors explicitly.

Do not convert large streams into memory buffers unless absolutely required.

## Networking

All outbound requests must have:

- timeout
- retry strategy when appropriate
- error handling
- cancellation support

Handle:

- DNS failures
- connection failures
- timeouts
- partial failures
- service unavailability

Do not create unbounded outbound traffic.

## Error handling

Handle errors explicitly.

Prefer:

- structured errors
- error causes
- consistent error propagation

Avoid:

- swallowed errors
- empty catch blocks
- silent failures

Critical failures must be observable.

## Logging

Use structured logging.

Logs should include:

- service name
- correlation id
- request id when available
- operation context
- duration when useful

Avoid:

- console.log in production
- logging secrets
- logging credentials
- logging tokens
- logging sensitive payloads

## Configuration

Load configuration at startup.

Validate:

- required variables
- formats
- ranges
- environment-specific settings

Fail fast when configuration is invalid.

Do not read process.env throughout the codebase.

## Security

Use secure defaults.

Avoid:

- eval
- dynamic code execution
- unsafe deserialization
- trusting user input
- unlimited payload sizes

Use cryptographically secure random generation when security depends on randomness.

Validate all external input.

## Performance

For high-load services:

- avoid event-loop blocking
- avoid unnecessary allocations
- avoid excessive object cloning
- avoid unnecessary serialization
- avoid repeated expensive computations
- reuse clients and connection pools
- use connection pooling where supported

Measure before optimizing.

Use profiling for performance-critical paths.

## Resource management

Manage resources explicitly.

Close:

- database connections
- network clients
- streams
- file handles
- worker threads

Avoid resource leaks.

## Dependency management

Prefer minimal dependencies.

Before adding a dependency:

- verify maintenance status
- verify security posture
- verify necessity

Avoid dependencies for trivial functionality.

Keep dependency trees small.

## Observability

Expose operational metrics.

Monitor:

- memory usage
- CPU usage
- event loop delay
- request latency
- error rate
- queue depth
- consumer lag
- active handles

Critical runtime behavior must be observable.

## High-load rules

Assume services may operate under sustained high load.

Design for:

- backpressure
- retries
- transient failures
- process restarts
- horizontal scaling

Avoid:

- in-memory coordination between instances
- assumptions about single-instance execution
- reliance on local process state for correctness

Runtime correctness must not depend on a specific process instance.

## Agent rules

When generating Node.js code:

- avoid blocking the event loop
- use async I/O
- control concurrency explicitly
- handle promise rejections
- use timeouts for network operations
- support graceful shutdown
- stream large payloads
- avoid unbounded memory growth
- use structured logging
- validate configuration at startup
- manage resources explicitly
- make failures observable
- design for horizontal scaling
- assume high-load production environments

# Pino

Pino is the primary logging library.

Use Pino for:

* structured logging
* application logs
* infrastructure logs
* request logs
* operational diagnostics
* error logging
* audit-related operational events when appropriate

Pino must be treated as observability infrastructure.

## Structured logging

All logs must be structured.

Prefer JSON logs.

Every log entry should be machine-readable.

Avoid free-form text logs.

Bad:

```text
User created successfully
```

Better:

```json
{
  "event": "user.created",
  "userId": "...",
  "tenantId": "..."
}
```

## Log levels

Use log levels consistently.

Use:

* trace
* debug
* info
* warn
* error
* fatal

Choose the lowest level that accurately reflects importance.

## Trace

Use trace for:

* detailed execution flow
* temporary diagnostics
* low-level runtime information

Trace logs should not be required for normal operations.

## Debug

Use debug for:

* development diagnostics
* troubleshooting
* execution decisions
* non-critical internal state

Debug logging should be safe to disable.

## Info

Use info for:

* service startup
* service shutdown
* successful operations worth tracking
* major state transitions
* background job execution
* consumer lifecycle events

Info logs should describe important operational events.

## Warn

Use warn for:

* recoverable failures
* retries
* degraded behavior
* unexpected but handled situations
* dependency instability

Warnings should indicate something requires attention.

## Error

Use error for:

* failed operations
* failed requests
* failed message processing
* dependency failures
* unexpected exceptions

Errors should include sufficient diagnostic context.

## Fatal

Use fatal for:

* unrecoverable failures
* process termination
* startup failures
* configuration failures preventing execution

Fatal logs should precede process exit.

## Log structure

Include consistent fields.

Recommended fields:

* timestamp
* level
* service
* environment
* correlationId
* requestId
* traceId
* spanId
* operation
* durationMs

Keep field naming consistent across services.

## Context

Logs should contain useful context.

Examples:

* tenantId
* userId when appropriate
* operation name
* topic name
* message key when safe
* database entity identifier

Include enough context for investigation.

Do not include unnecessary data.

## Correlation

Correlate logs across services.

Include:

* correlationId
* traceId
* spanId

Logs should support navigation from:

* logs
* traces
* metrics

Correlation must survive service boundaries.

## Errors

Always log actual error objects.

Prefer:

```ts id="0fqzpq"
logger.error(
  {
    err,
    operation: 'payment.process',
  },
  'Payment processing failed',
);
```

Avoid:

```ts id="0g4k5l"
logger.error(err.message);
```

Preserve stack traces.

Preserve error causes.

## Sensitive data

Never log:

* passwords
* access tokens
* refresh tokens
* session tokens
* secrets
* private keys
* payment card data
* authentication credentials

Avoid logging entire request bodies.

Avoid logging entire response bodies.

Redact sensitive fields when required.

## Request logging

Log request lifecycle consistently.

Capture:

* request start
* request completion
* duration
* status code
* failures

Avoid logging excessive request payloads.

## Database logging

Do not log full query results.

Prefer:

* operation type
* duration
* affected rows
* query identifier

Avoid logging sensitive SQL parameters.

## Messaging logging

Log:

* consumer startup
* consumer shutdown
* producer failures
* consumer failures
* retry attempts
* dead-letter routing

Avoid logging full message payloads by default.

## High-load logging

Logging must remain safe under load.

Avoid:

* logging inside tight loops
* excessive debug logging
* logging every database row
* logging every cache access
* logging every successful low-level operation

Logs should not become a performance bottleneck.

## Sampling

Use log sampling when necessary for:

* high-volume events
* repetitive warnings
* noisy diagnostics

Do not sample critical failures.

## Startup logging

Log:

* service startup
* version
* environment
* configuration summary when safe
* dependency initialization

Startup failures must be obvious.

## Shutdown logging

Log:

* graceful shutdown start
* dependency shutdown
* telemetry flush
* process termination

Unexpected shutdowns should be identifiable.

## Observability integration

Logs should integrate with:

* OpenTelemetry
* Grafana
* log aggregation systems

Logging should support distributed tracing workflows.

## Naming

Use stable event names.

Examples:

* service.started
* service.stopped
* consumer.started
* consumer.stopped
* message.processed
* message.failed
* database.query.failed

Avoid free-form event naming.

## Agent rules

When generating Pino logging:

* use structured JSON logs
* use appropriate log levels
* include correlation identifiers
* include trace identifiers when available
* log actual error objects
* preserve stack traces
* never log secrets
* avoid logging full payloads by default
* keep log volume under control
* make failures observable
* keep event names stable
* ensure logs support operational debugging
* ensure logs support distributed tracing workflows

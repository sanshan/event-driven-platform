# OpenTelemetry

OpenTelemetry is used as the vendor-neutral observability standard.

Use OpenTelemetry for:

* distributed tracing
* metrics
* logs correlation
* context propagation
* service instrumentation
* runtime observability
* request lifecycle visibility
* message processing visibility
* database operation visibility
* external call visibility

OpenTelemetry must be treated as observability infrastructure, not as application business logic.

## Signals

Use OpenTelemetry signals intentionally.

Primary signals:

* traces
* metrics
* logs

Traces show request and operation flow.

Metrics show aggregate system behavior.

Logs provide structured event details.

Do not use only logs when traces or metrics are required.

## Tracing

Use traces for distributed execution flow.

Trace:

* HTTP requests
* gRPC requests
* message consumption
* message production
* database operations
* cache operations
* external API calls
* scheduled jobs
* background workers

Each meaningful unit of work should be visible as a span.

## Spans

Create spans around meaningful operations.

Span names should be stable and low-cardinality.

Good span names:

* `http.request`
* `db.query`
* `cache.get`
* `cache.set`
* `message.consume`
* `message.produce`
* `job.execute`

Avoid high-cardinality span names.

Bad span names:

* `get-user-550e8400-e29b-41d4-a716-446655440000`
* `query-user-email-test@example.com`

Dynamic values belong in attributes, not span names.

## Attributes

Use attributes for useful context.

Good attributes:

* `service.name`
* `deployment.environment`
* `http.method`
* `http.route`
* `db.system`
* `db.operation.name`
* `messaging.system`
* `messaging.destination.name`
* `messaging.operation.name`
* `error.type`

Avoid high-cardinality attributes unless explicitly needed.

Do not put secrets, tokens or sensitive payloads into span attributes.

## Context propagation

Preserve trace context across boundaries.

Propagate context through:

* HTTP headers
* gRPC metadata
* message headers
* background job metadata
* async execution boundaries

Do not lose correlation between producer and consumer work.

## Messaging instrumentation

Instrument message producers and consumers.

For producers, capture:

* topic or destination
* message key when safe
* operation type
* publish duration
* errors

For consumers, capture:

* topic or destination
* partition when useful
* offset when useful
* consumer group
* processing duration
* retry count when available
* failure reason

Do not log or trace full message payloads by default.

## Database instrumentation

Instrument database operations.

Capture:

* database system
* operation type
* duration
* errors
* affected rows when useful

Avoid capturing full SQL with sensitive values.

Prefer sanitized statements or operation names.

## Cache instrumentation

Instrument cache operations.

Capture:

* cache system
* operation type
* hit or miss
* duration
* errors

Do not store full cache keys when they contain sensitive or high-cardinality values.

## Metrics

Use metrics for aggregate behavior.

Track:

* request count
* request duration
* error count
* queue depth
* consumer lag
* retry count
* external call duration
* database query duration
* cache hit ratio
* memory usage
* CPU usage
* event loop delay

Metric names should be stable.

Metric labels must be low-cardinality.

## Logs correlation

Logs should include trace correlation.

Include:

* trace id
* span id
* service name
* correlation id when available
* request id when available

Do not rely on logs alone for distributed request tracking.

## Errors

Record errors on spans.

When an operation fails:

* mark span status as error
* attach safe error type
* attach safe error message when appropriate
* preserve error cause in logs when safe

Do not expose secrets or sensitive payloads in telemetry.

## Sampling

Use sampling intentionally.

For high-load systems:

* avoid tracing every request in production unless capacity allows it
* keep error traces
* keep slow traces
* keep representative successful traces

Sampling must not hide critical failures.

## Cardinality

Control cardinality aggressively.

Avoid using these as metric labels or span names:

* user id
* email
* request id
* session id
* order id
* UUIDs
* raw URLs with IDs
* message offsets as labels

High cardinality can break observability systems under load.

## Service identity

Every service must define stable resource attributes.

Required:

* `service.name`
* `service.version`
* `deployment.environment`

Useful:

* `service.instance.id`
* `host.name`
* `cloud.region`
* `container.name`
* `k8s.pod.name`

## Collector

Prefer exporting telemetry through OpenTelemetry Collector.

The collector may handle:

* batching
* retries
* filtering
* enrichment
* sampling
* routing
* exporting to vendors

Applications should not be tightly coupled to a specific observability vendor.

## Exporters

Configure exporters explicitly.

Use:

* OTLP exporter where possible
* explicit endpoint
* explicit protocol
* explicit timeout
* explicit retry behavior

Do not silently drop telemetry without visibility.

## Performance

Instrumentation must be safe under high load.

Avoid:

* expensive span attributes
* large payload capture
* high-cardinality labels
* synchronous telemetry export in hot paths
* excessive custom spans
* unbounded telemetry queues

Telemetry must not become a production bottleneck.

## Health and readiness

Expose observability for service health.

Track:

* startup
* shutdown
* readiness
* dependency health
* exporter failures
* collector connectivity

Do not make business request success depend on telemetry export success.

## Agent rules

When generating OpenTelemetry code or configuration:

* use OpenTelemetry as vendor-neutral observability infrastructure
* instrument HTTP, messaging, database, cache and external calls
* preserve context across service and message boundaries
* use stable low-cardinality span names
* use low-cardinality metric labels
* never put secrets into telemetry
* avoid full payload capture by default
* record errors on spans
* correlate logs with trace id and span id
* define service resource attributes
* prefer OTLP export through OpenTelemetry Collector
* keep instrumentation lightweight
* make telemetry failures observable
* do not put business logic into instrumentation code

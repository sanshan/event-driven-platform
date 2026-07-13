# Prometheus

Prometheus is the primary metrics collection and monitoring system.

Use Prometheus for:

- metrics collection
- service monitoring
- infrastructure monitoring
- alerting data
- SLI measurement
- SLO measurement
- capacity planning
- operational visibility

Prometheus must be treated as observability infrastructure.

## Metrics first

Use metrics for aggregate system behavior.

Metrics should answer:

- Is the system healthy?
- Is the system fast enough?
- Is the system overloaded?
- Is the system failing?
- Is the system scaling correctly?

Do not use metrics to investigate individual users or individual requests.

Use logs and traces for that.

## Metric design

Metrics should be:

- stable
- low cardinality
- meaningful
- actionable

Every metric should have a clear operational purpose.

Avoid collecting metrics that nobody uses.

## Metric naming

Use clear names.

Prefer:

```text id="h1ld3l"
http_requests_total
http_request_duration_seconds
database_query_duration_seconds
consumer_messages_processed_total
```

Avoid:

```text id="p9pdiz"
requests
queries
counter
metric1
```

Metric names should describe:

- what is measured
- measurement unit
- metric type

## Metric types

Use the correct metric type.

### Counter

Use counters for values that only increase.

Examples:

- requests processed
- messages consumed
- errors
- retries

Counters should never decrease.

### Gauge

Use gauges for current state.

Examples:

- memory usage
- queue size
- active requests
- active consumers
- connection count

Gauges may increase and decrease.

### Histogram

Use histograms for latency and distributions.

Examples:

- request duration
- query duration
- message processing duration
- external API duration

Prefer histograms for latency measurements.

### Summary

Avoid summaries unless there is a specific reason.

Prefer histograms for aggregation across instances.

## Labels

Labels must remain low cardinality.

Good labels:

- service
- environment
- method
- route
- operation
- status class
- database
- topic

Avoid:

- userId
- email
- requestId
- sessionId
- UUID
- orderId
- paymentId
- traceId

High-cardinality labels can break Prometheus performance.

## Cardinality

Control cardinality aggressively.

Before adding a label ask:

- How many possible values exist?
- Can the number grow without limit?
- Is aggregation still useful?

If the answer is unclear, do not add the label.

## HTTP metrics

Track:

- request count
- request duration
- active requests
- response codes

Prefer route templates:

Good:

```text id="7n5izf"
/users/:id
```

Bad:

```text id="55jy6k"
/users/550e8400-e29b-41d4-a716-446655440000
```

Never use raw URLs as labels.

## Database metrics

Track:

- query duration
- query count
- connection pool usage
- active connections
- failed queries
- transaction duration

Do not label metrics with raw SQL statements.

Use query categories instead.

## Messaging metrics

Track:

- produced messages
- consumed messages
- processing duration
- retries
- dead-letter events
- consumer lag

Labels may include:

- topic
- consumer group
- operation

Avoid partition-level labels unless necessary.

## Cache metrics

Track:

- hit count
- miss count
- hit ratio
- operation duration
- memory usage

Cache effectiveness should be measurable.

## Runtime metrics

Track:

- CPU usage
- memory usage
- event loop delay
- garbage collection activity
- active handles
- process uptime

Runtime health should be visible.

## Business-independent monitoring

Prometheus metrics should focus on operational behavior.

Prefer:

- throughput
- latency
- failures
- saturation

Avoid embedding business reporting into infrastructure metrics.

## Golden signals

Every service should expose:

- latency
- traffic
- errors
- saturation

These metrics should be easy to find and visualize.

## Histograms

Use histograms for latency.

Examples:

- HTTP duration
- database duration
- cache duration
- messaging duration
- external API duration

Bucket ranges should reflect real production expectations.

Avoid arbitrary buckets.

## Units

Always include units.

Examples:

```text id="t4dw3q"
request_duration_seconds
memory_usage_bytes
queue_depth
```

Do not create metrics with ambiguous units.

## Alerts

Metrics should support alerting.

Metrics should make it possible to detect:

- downtime
- elevated latency
- elevated error rates
- consumer lag
- resource exhaustion
- dependency failures

Do not create metrics that cannot drive operational decisions.

## Scraping

Metrics endpoints should be lightweight.

Avoid expensive calculations during metric collection.

Metric generation should not become a bottleneck.

## High-load systems

For high-load services:

- minimize label cardinality
- avoid per-entity metrics
- avoid dynamic metric names
- avoid expensive collectors
- use histograms carefully
- monitor metric volume

Prometheus stability is more important than metric completeness.

## Observability integration

Prometheus metrics should integrate with:

- Grafana dashboards
- Alertmanager
- OpenTelemetry metrics pipelines

Metrics should support end-to-end observability workflows.

## Agent rules

When generating Prometheus instrumentation:

- use the correct metric type
- keep labels low cardinality
- never use user identifiers as labels
- expose golden signals
- use histograms for latency
- include units in metric names
- avoid dynamic metric names
- avoid expensive collectors
- make metrics operationally useful
- support alerting use cases
- optimize for high-load environments
- keep metrics stable over time

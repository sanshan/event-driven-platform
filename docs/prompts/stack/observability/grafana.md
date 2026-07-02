# Grafana

Grafana is used for observability visualization and operational monitoring.

Use Grafana for:

* dashboards
* metrics visualization
* tracing visualization
* log exploration
* alerting
* service monitoring
* infrastructure monitoring
* business-independent operational monitoring

Grafana must be treated as an observability and operational tooling platform.

## Dashboard design

Dashboards should answer operational questions.

Every dashboard should help operators understand:

* system health
* performance
* failures
* capacity
* trends
* incidents

Avoid dashboards that only display raw metrics without context.

## Dashboard hierarchy

Prefer multiple focused dashboards.

Examples:

* platform overview
* service overview
* infrastructure overview
* database overview
* messaging overview
* cache overview
* tracing overview

Avoid giant dashboards containing everything.

## Dashboard structure

Prefer dashboard sections.

Common sections:

* health
* traffic
* latency
* errors
* saturation
* dependencies
* infrastructure

Critical information should appear near the top.

## Golden signals

Dashboards should prioritize the golden signals.

Track:

* latency
* traffic
* errors
* saturation

These signals should be visible for every important service.

## Service dashboards

Every service should expose:

* request rate
* request duration
* error rate
* active requests
* dependency health
* resource usage

Operators should understand service state within seconds.

## Database dashboards

Monitor:

* query latency
* slow queries
* connection pool usage
* active connections
* lock waits
* deadlocks
* replication lag
* WAL growth
* storage growth
* transaction duration

Database bottlenecks should be visible immediately.

## Messaging dashboards

Monitor:

* producer throughput
* consumer throughput
* consumer lag
* retry rate
* dead-letter rate
* partition distribution
* broker health
* storage growth

Messaging backpressure must be visible.

## Cache dashboards

Monitor:

* hit rate
* miss rate
* memory usage
* eviction rate
* latency
* connection count

Cache effectiveness should be measurable.

## Infrastructure dashboards

Monitor:

* CPU
* memory
* disk usage
* disk I/O
* network traffic
* network errors
* container health
* pod health
* node health

Infrastructure problems should be distinguishable from application problems.

## Tracing

Integrate distributed tracing.

Use Grafana to visualize:

* request flow
* service dependencies
* latency breakdown
* failed requests
* slow operations

Traces should be accessible from dashboards when possible.

## Logs

Integrate log exploration.

Logs should support:

* trace correlation
* service filtering
* environment filtering
* error investigation

Grafana should help navigate from metrics to logs and traces.

## Alerts

Alerts must be actionable.

Every alert should answer:

* what failed
* where it failed
* how severe it is
* what should be investigated

Avoid alerts that only report a raw metric threshold.

## Alert quality

Prefer:

* low noise
* high signal
* actionable alerts

Avoid:

* alert storms
* duplicate alerts
* flapping alerts
* alerts without ownership

## Alert categories

Typical alert categories:

Critical:

* service unavailable
* database unavailable
* consumer stopped
* message backlog critical

Warning:

* elevated latency
* elevated error rate
* resource pressure
* retry increase

Informational:

* deployment completed
* maintenance events

## Thresholds

Alert thresholds should reflect operational reality.

Avoid arbitrary values.

Thresholds should be based on:

* service SLOs
* historical behavior
* capacity limits
* business requirements

## Variables

Use dashboard variables carefully.

Good variables:

* environment
* service
* namespace
* cluster
* topic

Avoid variables that create excessive query cardinality.

## Cardinality

Avoid dashboards that depend on high-cardinality labels.

Do not build dashboards around:

* user ids
* emails
* session ids
* request ids
* UUIDs

Use traces and logs for individual investigations.

Use metrics for aggregation.

## Performance

Dashboard queries must be efficient.

Avoid:

* expensive full-range scans
* excessive cardinality
* overly complex panels
* unnecessary refresh intervals

Observability systems must remain responsive under load.

## Multi-environment monitoring

Separate environments clearly.

At minimum:

* development
* acceptance
* production

Operators must never confuse environments.

Environment should always be visible.

## Naming

Use clear names.

Dashboard names should describe purpose.

Examples:

* Platform Overview
* User Service Overview
* PostgreSQL Overview
* Redpanda Overview
* Redis Overview

Avoid ambiguous dashboard names.

## Agent rules

When generating Grafana dashboards or alerts:

* prioritize operational visibility
* expose golden signals
* create focused dashboards
* avoid giant dashboards
* use actionable alerts
* avoid high-cardinality metrics
* make failures visible
* separate environments clearly
* include service, database, messaging and infrastructure monitoring
* support correlation between metrics, logs and traces
* optimize dashboard query performance
* prefer maintainable dashboards over visually complex dashboards

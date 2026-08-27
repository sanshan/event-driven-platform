# @event-driven-platform/observability

Technology-neutral observability contracts for EDP execution boundaries.

The package defines separate typed lifecycle models for Runner, Reader, and UseCaseExecutor. Each observer exposes one operation:

```ts
observe(observation): void
```

Observations describe execution facts. They do not prescribe counters, histograms, spans, logs, exporters, or a telemetry backend. The canonical measurement catalog is documented in [`docs/observability.md`](../../docs/observability.md).

## Safety

Observability must not affect execution correctness. Wrap consumer observers with `SafeObserver` before supplying them to an execution pipeline:

```ts
const observer = new SafeObserver(new ApplicationTelemetryObserver());
```

`SafeObserver` contains delegate exceptions. `NoopObserver` is available when observability is not configured.

## Metrics, traces, and logs

One observation may feed several telemetry signals. A consumer can map the same lifecycle fact to its own stack:

```ts
class ApplicationRunnerObserver implements RunnerObserver {
    observe(observation: RunnerObservation): void {
        if (observation.type === 'execution.completed') {
            metrics.executionDuration.record(observation.durationMs, {
                operation: observation.context.operation,
                outcome: observation.outcome,
            });

            trace.finishExecution(observation);
            logger.info('runner execution completed', observation);
        }
    }
}
```

The example is illustrative only. This package does not depend on or ship OpenTelemetry, Prometheus, Grafana, or a logging implementation.

## Metric dimensions

Observation payload and metric dimensions are different concerns. Correlation data may be useful for traces or logs without being safe as metric labels.

Use only bounded dimensions defined by the measurement catalog. Operation/read names and bounded outcomes are suitable defaults. Tenant may be enabled by a consumer only when deployment cardinality is acceptable. User/actor IDs, intent IDs, correlation IDs, execution IDs, cache keys, arbitrary entity IDs, error messages, and stacks must not become metric dimensions.

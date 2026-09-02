# @event-driven-platform/observability

Technology-neutral observability contracts for EDP execution boundaries.

The package defines separate typed lifecycle models for Runner, Reader, and UseCaseExecutor. Each observer exposes one synchronous operation:

```ts
observe(observation): undefined
```

Returning `undefined` keeps observation synchronous at the type boundary, so failures can be contained before they reach an execution pipeline.

Observations describe execution facts. They do not prescribe counters, histograms, spans, logs, exporters, or a telemetry backend. The canonical measurement catalog is documented in [`docs/architecture/observability.md`](../../docs/architecture/observability.md).

## Safety

Observability must not affect execution correctness. Runner, Reader, and UseCaseExecutor internally wrap a supplied observer with `SafeObserver`, and use no-op observability when no observer is configured. Consumers can therefore provide their observer directly to those execution boundaries without adding a second safety wrapper.

`SafeObserver` and `NoopObserver` remain public utilities for custom composition outside those built-in boundaries.

## Metrics, traces, and logs

One observation may feed several telemetry signals. A consumer can map the same lifecycle fact to its own stack:

```ts
class ApplicationRunnerObserver implements RunnerObserver {
    observe(observation: RunnerObservation): undefined {
        if (observation.type === 'execution.completed') {
            metrics.executionDuration.record(observation.durationMs, {
                operation: observation.context.operation,
                outcome: observation.outcome,
            });

            trace.finishExecution(observation);
            logger.info('runner execution completed', observation);
        }

        return undefined;
    }
}
```

The example is illustrative only. This package does not depend on or ship OpenTelemetry, Prometheus, Grafana, or a logging implementation.

## Metric dimensions

Observation payload and metric dimensions are different concerns. Correlation data may be useful for traces or logs without being safe as metric labels.

Use only bounded dimensions defined by the measurement catalog. Operation, Read, and UseCase names plus bounded outcomes are suitable defaults. Tenant may be enabled by a consumer only when deployment cardinality is acceptable. User/actor IDs, intent IDs, correlation IDs, execution IDs, cache keys, arbitrary entity IDs, error messages, and stacks must not become metric dimensions.

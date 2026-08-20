# @event-driven-platform/aggregate-reference

Defines typed references to domain aggregates without exposing aggregate implementations.

## Installation

```bash
pnpm add @event-driven-platform/aggregate-reference
```

## Role

`AggregateReference` carries stable aggregate identity across platform contracts while keeping execution primitives independent of domain aggregate classes and persistence models.

## API

- `AggregateReference`, `AnyAggregateReference` — reference contracts.
- `AggregateReferenceDescriptor` — serializable construction input.
- `AggregateReferenceFactory` — construction contract.
- `DefaultAggregateReferenceFactory` — default validated factory.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

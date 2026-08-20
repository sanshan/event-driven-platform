# @event-driven-platform/subject

Defines the subject metadata used to identify what platform work acts on.

## Installation

```bash
pnpm add @event-driven-platform/subject
```

## Role

A `Subject` identifies the business subject associated with an Operation while remaining independent of persistence and transport concerns.

## API

- `Subject`, `SubjectDescriptor` — subject contracts.
- `SubjectFactory` — construction contract.
- `DefaultSubjectFactory` — default validated factory implementation.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) for the platform architecture.

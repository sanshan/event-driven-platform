# @event-driven-platform/tenant-reference

Defines typed tenant references for multi-tenant platform metadata.

## Installation

```bash
pnpm add @event-driven-platform/tenant-reference
```

## Role

`TenantReference` represents tenant identity as a reusable contract without coupling domain or execution code to a tenant persistence model.

## API

- `TenantReference`, `AnyTenantReference` — tenant reference contracts.
- `TenantReferenceDescriptor` — construction input.
- `TenantReferenceFactory` — factory contract.
- `DefaultTenantReferenceFactory` — default validated factory.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md).

# @event-driven-platform/query

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Defines the current `Query` transport contract for the incomplete read side.

## Role

`Query` carries a `Read` together with read-execution options and context. It is intentionally separate from the business-oriented Read itself.

The repository does not yet contain a complete read execution engine. This README describes only the Query abstraction that exists today and does not document planned behavior.

## API

- `Query` — current read transport contract.
- `QueryOptions` — current execution-option contract.
- `QueryContext` — current query context contract.

## Architectural boundary

Query contains no business logic and must not collapse into Read.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

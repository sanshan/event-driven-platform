# @event-driven-platform/read

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Defines the business-oriented `Read` contract for the incomplete read side of the platform.

## Role

A Read describes an intent to obtain data and carries business-facing read metadata/parameters. It is intentionally separate from `Query`, which carries read execution concerns.

The read execution pipeline is not complete in the current repository. This README documents only the implemented `Read` contract and does not imply a future execution API.

## API

`Read` is the package's current exported contract, including its type-level association with the expected result.

## Architectural boundary

Reads remain business-oriented and must not acquire cache, storage, or infrastructure responsibilities.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

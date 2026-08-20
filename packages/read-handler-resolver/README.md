# @event-driven-platform/read-handler-resolver

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Defines the typed handler-resolution boundary for the incomplete read side.

## Role

`ReadHandlerResolver` maps a Read to an explicit resolution outcome:

- `resolved` with one or more typed handlers in deterministic order;
- `not-found` when no handler set is available;
- `ambiguous` when resolution cannot safely select one deterministic handler set.

The resolver performs lookup/composition only. It does not execute handlers, traverse caches, write caches, coordinate in-flight requests, or implement Reader behavior.

## Architectural boundary

A Read may have multiple source-specific handlers. Each handler remains independently responsible for one source. Resolver ordering is the ordering returned to the future Reader execution layer; the resolver itself does not execute that sequence.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

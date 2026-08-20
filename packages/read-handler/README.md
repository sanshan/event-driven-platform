# @event-driven-platform/read-handler

> **Status: Draft / internal.** This package is not part of the supported public package boundary.

Defines the typed source-read handler contract for the incomplete read side.

## Role

`ReadHandler<TRead>` executes exactly one source-specific read responsibility and returns the result type associated with `TRead`.

```ts
interface ReadHandler<TRead extends AnyRead> {
    execute(read: TRead): Promise<ReadResultOf<TRead>>;
}
```

A handler is not a read orchestrator. It does not resolve other handlers, traverse caches, write caches, coordinate in-flight requests, or invoke Reader.

## Architectural boundary

- one handler reads from one source;
- handlers remain typed to the Read result;
- cache writes are outside this contract;
- multiple handlers may exist for the same Read and are selected/composed through the resolver boundary.

The repository does not yet contain a complete Reader execution pipeline. This README documents only the contract implemented by this package.

## Related documentation

See the **Draft read side** section of [`docs/architecture/README.md`](../../docs/architecture/README.md).

# @event-driven-platform/read-handler-resolver

Defines the typed handler-resolution boundary for the stable Read pipeline.

## Role

`ReadHandlerResolver` maps a Read to an explicit resolution outcome:

- `resolved` with one or more typed handlers in deterministic order;
- `not-found` when no handler set exists;
- `ambiguous` when resolution cannot safely choose a deterministic handler set.

```ts
import type {
    ReadHandlerResolution,
    ReadHandlerResolver,
} from '@event-driven-platform/read-handler-resolver';

class AppReadHandlerResolver implements ReadHandlerResolver {
    public resolve<TRead extends AnyRead>(
        read: TRead,
    ): ReadHandlerResolution<TRead> {
        // Application-specific lookup/registration belongs here.
    }
}
```

The package intentionally does not prescribe a registry or dependency-injection mechanism. Applications may implement resolution in the form that fits their composition model while preserving the explicit outcome contract.

## Public API

- `ReadHandlerResolver`
- `ReadHandlerResolution`

## Architectural boundary

Resolver performs lookup/composition only. It does not execute handlers, traverse or populate caches, coordinate in-flight work, or implement Reader behavior.

A resolution may contain multiple ordered handlers, but the current Reader/source contract executes the first resolved handler; `ReadHandler` itself has no cache-like `miss` outcome and handlers are not treated as source fallbacks.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)

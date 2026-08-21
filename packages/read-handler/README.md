# @event-driven-platform/read-handler

Defines the typed source-handler contract for the stable Read pipeline.

## Role

`ReadHandler<TRead>` executes one source-specific read responsibility and returns the result associated with `TRead`.

```ts
import type { ReadHandler } from '@event-driven-platform/read-handler';

class GetUserHandler implements ReadHandler<GetUserRead> {
    public async execute(read: GetUserRead): Promise<UserView> {
        return userRepository.getById(read.parameters.userId);
    }
}
```

A handler is a source boundary, not a read orchestrator. It does not resolve other handlers, traverse caches, populate caches, coordinate in-flight work, or invoke Reader.

## Public API

- `ReadHandler`

## Architectural boundary

- one handler owns one source responsibility;
- handler input and output remain typed through the Read contract;
- handlers never write Reader-managed caches;
- handler selection/composition belongs to `ReadHandlerResolver`;
- execution belongs to Reader.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)

# @event-driven-platform/read

Defines the business-oriented `Read` contract for the stable Read pipeline.

## Role

A Read describes an intent to obtain data. It carries the actor and business-facing parameters and associates the intent with its result type without adding result metadata at runtime.

Read deliberately does not know about cache topology, timeout, coordination, storage, Redis, or Reader infrastructure. Those execution concerns belong to `Query` and `Reader`.

## Example

```ts
import type { Read } from '@event-driven-platform/read';

interface UserView {
    readonly id: string;
    readonly name: string;
}

type GetUserRead = Read<
    'user.get',
    { readonly userId: string },
    UserView
>;

const read: GetUserRead = {
    name: 'user.get',
    actor,
    parameters: { userId: 'user-42' },
};
```

`ReadResultOf<TRead>` can recover the associated result type when building handlers or other typed integrations.

## Public API

- `Read`
- `AnyRead`
- `ReadResultOf`

## Architectural boundary

Reads are reusable business intents. They must not acquire cache, transport, storage, timeout, coordination, or infrastructure responsibilities.

## Related documentation

- [`docs/architecture/README.md`](../../docs/architecture/README.md)
- [`docs/read-public-api.md`](../../docs/read-public-api.md)

# @event-driven-platform/types

Shared TypeScript type primitives used by the platform packages.

## Installation

```bash
pnpm add @event-driven-platform/types
```

## API

### `Brand<T, TBrand>`

Creates a nominally distinct type from a structural TypeScript type. Platform identity packages use it to prevent values with the same runtime representation from being mixed accidentally.

```ts
import type { Brand } from '@event-driven-platform/types';

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
```

`Brand` is a type-only utility and adds no runtime behavior.

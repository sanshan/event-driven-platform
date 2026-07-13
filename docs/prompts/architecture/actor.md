# Actor

Actor represents an immutable snapshot of who initiated an Operation.

Actor is not authentication state.

Actor is not authorization data.

Actor is not execution context.

## Purpose

Actor answers:

```txt
Who initiated this Operation?
```

Actor may also carry observable information about where the Operation was initiated.

## Public API

```ts
export type ActorType = 'user' | 'service' | 'system' | 'scheduler';

export interface Actor {
    readonly type: ActorType;

    readonly id: string;

    readonly origin: ActorOrigin;
}

export interface ActorOrigin {
    readonly ipAddress?: string;

    readonly countryCode?: string;
    readonly region?: string;
    readonly city?: string;

    readonly latitude?: number;
    readonly longitude?: number;
    readonly timezone?: string;

    readonly environment?: string;
    readonly host?: string;
    readonly instance?: string;
}
```

## Fields

### type

`type` identifies the category of the initiator.

### id

`id` identifies the concrete logical initiator within its type.

Examples:

```txt
user      -> userId
service   -> payment-service
system    -> wallet-reconciliation
scheduler -> expire-pending-payments
```

`id` must be stable and non-empty.

ActorFactory must not generate it.

### origin

`origin` describes the observable location or runtime from which the Operation was initiated.

For users it may contain:

```txt
IP address
country
city
coordinates
timezone
```

For services, systems and schedulers it may contain:

```txt
IP address
environment
region
host
instance
```

All origin fields are optional because different actor types provide different context.

## ActorDescriptor

Actor is created from ActorDescriptor.

```ts
export interface ActorDescriptor {
    readonly type: ActorType;

    readonly id: string;

    readonly origin?: ActorOrigin;
}
```

ActorDescriptor contains input data that may require validation and normalization.

It must not be stored as a valid Actor.

## ActorFactory

ActorFactory creates Actor from ActorDescriptor.

```ts
export interface ActorFactory {
    create(descriptor: ActorDescriptor): Actor;
}
```

ActorFactory is responsible for:

- validation
- normalization
- defensive copying
- deep immutability
- JSON-safe output

ActorFactory does not resolve users, inspect requests, determine IP addresses or collect runtime metadata.

The caller must provide this information.

## Usage in Operation

Operation contains the finalized Actor.

```ts
export interface Operation<TData> {
    readonly intent: Intent;

    readonly correlationId: string;

    readonly actor: Actor;

    readonly subject: Subject;

    readonly data: TData;
}
```

Actor is created before Operation.

Runner does not reconstruct or enrich Actor.

## Constraints

Actor must not contain:

- roles or permissions
- tokens or sessions
- HTTP request objects
- Command options
- retry information
- correlationId
- Intent
- subject
- execution attempt data

Actor must be immutable and JSON-serializable.

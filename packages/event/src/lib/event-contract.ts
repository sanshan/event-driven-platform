import { z } from 'zod';

import type { EventEnvelope } from './event-envelope.js';
import type { Event } from './event.js';

interface EventContractShape {
    readonly name: string;

    readonly schemaVersion: number;

    readonly payload: z.ZodType;
}

export interface EventContract<
    TName extends string,
    TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
> {
    readonly name: TName;

    readonly schemaVersion: TSchemaVersion;

    readonly payload: TPayloadSchema;

    create(payload: z.input<TPayloadSchema>): Event<TName, TSchemaVersion, z.output<TPayloadSchema>>;

    parse(value: unknown): Event<TName, TSchemaVersion, z.output<TPayloadSchema>>;
}

export type EventPayloadOf<TContract extends EventContractShape> = z.output<TContract['payload']>;

export type EventOf<TContract extends EventContractShape> = Event<
    TContract['name'],
    TContract['schemaVersion'],
    EventPayloadOf<TContract>
>;

export type EventEnvelopeOf<TContract extends EventContractShape> = EventEnvelope<EventOf<TContract>>;

export function defineEventContract<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadOutput,
    TPayloadInput,
>(definition: {
    readonly name: TName;
    readonly schemaVersion: TSchemaVersion;
    readonly payload: z.ZodType<TPayloadOutput, TPayloadInput>;
}): EventContract<
    TName,
    TSchemaVersion,
    z.ZodType<TPayloadOutput, TPayloadInput>
> {
    const eventIdentitySchema = z.object({
        name: z.literal(definition.name),
        schemaVersion: z.literal(definition.schemaVersion),
        payload: z.unknown(),
    });

    return {
        ...definition,
        create(payload) {
            return {
                name: definition.name,
                schemaVersion: definition.schemaVersion,
                payload: definition.payload.parse(payload),
            };
        },
        parse(value) {
            const parsed = eventIdentitySchema.parse(value);

            return {
                name: definition.name,
                schemaVersion: definition.schemaVersion,
                payload: definition.payload.parse(parsed.payload),
            };
        },
    };
}

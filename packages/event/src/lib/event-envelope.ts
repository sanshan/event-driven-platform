import type { AnyEvent } from './event.js';
import type { EventActor } from './event-actor.js';
import type { EventAggregate } from './event-aggregate.js';
import type { EventSubject } from './event-subject.js';
import type { EventTenant } from './event-tenant.js';

export interface EventEnvelope<TEvent extends AnyEvent, TOperationName extends string = string> {
    readonly eventId: string;

    readonly eventName: TEvent['name'];

    readonly schemaVersion: TEvent['schemaVersion'];

    readonly occurredAt: string;

    readonly intentId: string;

    readonly correlationId: string;

    readonly operationName: TOperationName;

    readonly tenant: EventTenant;

    readonly actor: EventActor;

    readonly subject: EventSubject;

    readonly aggregate: EventAggregate;

    readonly payload: TEvent['payload'];
}

export type AnyEventEnvelope = EventEnvelope<AnyEvent>;

import type { AnyAggregateReference } from '@event-driven-platform/aggregate-reference';
import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

import type { AnyEvent } from './event.js';
import type { EventActor } from './event-actor.js';
import type { EventId } from './event-id.js';
import type { EventSubject } from './event-subject.js';

export interface EventEnvelope<
    TEvent extends AnyEvent,
    TOperationName extends string = string,
    TTenant extends AnyTenantReference = AnyTenantReference,
    TAggregate extends AnyAggregateReference = AnyAggregateReference,
> {
    readonly eventId: EventId;

    readonly eventName: TEvent['name'];

    readonly schemaVersion: TEvent['schemaVersion'];

    readonly occurredAt: string;

    readonly intentId: string;

    readonly correlationId: string;

    readonly operationName: TOperationName;

    readonly tenant: TTenant;

    readonly actor: EventActor;

    readonly subject: EventSubject;

    readonly aggregate: TAggregate;

    readonly payload: TEvent['payload'];
}

export type AnyEventEnvelope = EventEnvelope<
    AnyEvent,
    string,
    AnyTenantReference,
    AnyAggregateReference
>;

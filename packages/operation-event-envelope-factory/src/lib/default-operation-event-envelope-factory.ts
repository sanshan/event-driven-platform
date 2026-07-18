import type { Clock } from '@event-driven-platform/clock';
import type { AnyEvent, EventEnvelope, EventIdFactory } from '@event-driven-platform/event';
import type { AnyOperation } from '@event-driven-platform/operation';

import type {
    CreateOperationEventEnvelopesRequest,
    OperationEventEnvelopeFactory,
} from './operation-event-envelope-factory.js';

export class DefaultOperationEventEnvelopeFactory implements OperationEventEnvelopeFactory {
    constructor(
        private readonly clock: Clock,
        private readonly eventIdFactory: EventIdFactory,
    ) {}

    createMany<TEvent extends AnyEvent, TOperation extends AnyOperation>(
        request: CreateOperationEventEnvelopesRequest<TEvent, TOperation>,
    ): readonly EventEnvelope<
        TEvent,
        TOperation['name'],
        TOperation['tenant'],
        TOperation['aggregate']
    >[] {
        const { operation, context, events } = request;

        const occurredAt = this.clock.now();

        return Object.freeze(
            events.map((event, eventIndex) =>
                Object.freeze({
                    eventId: this.eventIdFactory.create({
                        intentId: operation.intent.id,
                        eventIndex,
                        eventName: event.name,
                        schemaVersion: event.schemaVersion,
                    }),

                    eventName: event.name,
                    schemaVersion: event.schemaVersion,

                    occurredAt,

                    intentId: operation.intent.id,
                    correlationId: context.correlationId,
                    operationName: operation.name,

                    tenant: operation.tenant,

                    actor: {
                        type: operation.actor.type,
                        id: operation.actor.id,
                        origin: {
                            ipAddress: operation.actor.origin.ipAddress ?? null,

                            countryCode: operation.actor.origin.countryCode ?? null,

                            region: operation.actor.origin.region ?? null,

                            city: operation.actor.origin.city ?? null,

                            latitude: operation.actor.origin.latitude ?? null,

                            longitude: operation.actor.origin.longitude ?? null,

                            timezone: operation.actor.origin.timezone ?? null,

                            environment: operation.actor.origin.environment ?? null,

                            host: operation.actor.origin.host ?? null,

                            instance: operation.actor.origin.instance ?? null,
                        },
                    },

                    subject: {
                        type: operation.subject.type,
                        id: operation.subject.id,
                    },

                    aggregate: operation.aggregate,

                    payload: event.payload,
                }),
            ),
        );
    }
}

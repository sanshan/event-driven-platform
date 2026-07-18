import type { Clock } from '@event-driven-platform/clock';
import type { AnyEventEnvelope } from '@event-driven-platform/event';

import type { OutboxRecord } from './outbox-record.js';
import type { OutboxRecordFactory } from './outbox-record.factory.js';

export class DefaultOutboxRecordFactory implements OutboxRecordFactory {
    constructor(private readonly clock: Clock) {}

    createMany<TEnvelope extends AnyEventEnvelope>(
        envelopes: readonly TEnvelope[],
    ): readonly OutboxRecord<TEnvelope>[] {
        if (envelopes.length === 0) {
            return Object.freeze([]);
        }

        const createdAt = this.clock.now();

        return Object.freeze(
            envelopes.map((envelope) =>
                Object.freeze({
                    id: envelope.eventId,
                    envelope,
                    createdAt,
                }),
            ),
        );
    }
}

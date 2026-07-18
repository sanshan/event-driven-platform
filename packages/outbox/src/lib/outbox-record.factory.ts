import type { AnyEventEnvelope } from '@event-driven-platform/event';

import type { OutboxRecord } from './outbox-record.js';

export interface OutboxRecordFactory {
    createMany<TEnvelope extends AnyEventEnvelope>(
        envelopes: readonly TEnvelope[],
    ): readonly OutboxRecord<TEnvelope>[];
}

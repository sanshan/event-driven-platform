import type { AnyEventEnvelope } from '@event-driven-platform/event';

import type { OutboxRecordId } from './outbox-record-id.js';

export interface OutboxRecord<TEnvelope extends AnyEventEnvelope = AnyEventEnvelope> {
    readonly id: OutboxRecordId;

    readonly envelope: TEnvelope;

    readonly createdAt: string;
}

export type AnyOutboxRecord = OutboxRecord<AnyEventEnvelope>;

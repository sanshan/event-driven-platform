import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Clock } from '@event-driven-platform/clock';
import type { Event, EventEnvelope, EventId } from '@event-driven-platform/event';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import { DefaultOutboxRecordFactory, type OutboxRecord, type OutboxRecordId } from '../index.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface WalletCreatedPayload {
    readonly walletId: WalletId;
}

type WalletCreatedEvent = Event<'wallet.created', 1, WalletCreatedPayload>;

type WalletCreatedEnvelope = EventEnvelope<
    WalletCreatedEvent,
    'CreateWallet',
    MerchantTenant,
    WalletAggregate
>;

class FixedClock implements Clock {
    constructor(private readonly timestamp: string) {}

    now(): string {
        return this.timestamp;
    }
}

const eventId = '675bff27-b43f-58f3-a567-41915ac379a5' as EventId;

const merchantId = 'merchant-1' as MerchantId;

const walletId = 'wallet-1' as WalletId;

const envelope: WalletCreatedEnvelope = {
    eventId,
    eventName: 'wallet.created',
    schemaVersion: 1,
    occurredAt: '2026-07-18T10:00:00.000Z',
    intentId: 'intent-1',
    correlationId: 'flow-1',
    operationName: 'CreateWallet',
    tenant: {
        type: 'merchant',
        id: merchantId,
    },
    actor: {
        type: 'user',
        id: 'user-1',
        origin: {
            ipAddress: null,
            countryCode: null,
            region: null,
            city: null,
            latitude: null,
            longitude: null,
            timezone: null,
            environment: null,
            host: null,
            instance: null,
        },
    },
    subject: {
        type: 'user',
        id: 'user-1',
    },
    aggregate: {
        type: 'wallet',
        id: walletId,
    },
    payload: {
        walletId,
    },
};

function createFactory(): DefaultOutboxRecordFactory {
    return new DefaultOutboxRecordFactory(new FixedClock('2026-07-18T10:00:01.000Z'));
}

describe('DefaultOutboxRecordFactory', () => {
    it('creates OutboxRecords from EventEnvelopes', () => {
        const factory = createFactory();

        const records = factory.createMany([envelope]);

        expect(records).toEqual([
            {
                id: eventId,
                envelope,
                createdAt: '2026-07-18T10:00:01.000Z',
            },
        ]);

        const record = records[0];

        expect(record).toBeDefined();

        if (record === undefined) {
            throw new Error('Expected one OutboxRecord.');
        }

        expectTypeOf(record).toEqualTypeOf<OutboxRecord<WalletCreatedEnvelope>>();

        expectTypeOf(record.id).toEqualTypeOf<OutboxRecordId>();
    });

    it('uses EventId as the OutboxRecord identifier', () => {
        const factory = createFactory();

        const records = factory.createMany([envelope]);

        const record = records[0];

        expect(record).toBeDefined();

        if (record === undefined) {
            throw new Error('Expected one OutboxRecord.');
        }

        expect(record.id).toBe(envelope.eventId);
    });

    it('creates one record for each EventEnvelope', () => {
        const factory = createFactory();

        const secondEnvelope: WalletCreatedEnvelope = {
            ...envelope,
            eventId: '8a322863-6996-5c91-b8df-b668e78dbf52' as EventId,
        };

        const records = factory.createMany([envelope, secondEnvelope]);

        expect(records).toHaveLength(2);

        expect(records[0]?.id).toBe(envelope.eventId);

        expect(records[1]?.id).toBe(secondEnvelope.eventId);
    });

    it('creates an empty collection for an empty EventEnvelope collection', () => {
        const factory = createFactory();

        const records = factory.createMany([]);

        expect(records).toEqual([]);
    });

    it('freezes each created record', () => {
        const factory = createFactory();

        const records = factory.createMany([envelope]);

        const record = records[0];

        expect(record).toBeDefined();

        if (record === undefined) {
            throw new Error('Expected one OutboxRecord.');
        }

        expect(Object.isFrozen(record)).toBe(true);
    });
});

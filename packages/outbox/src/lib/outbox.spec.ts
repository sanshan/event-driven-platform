import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Event, EventEnvelope, EventId } from '@event-driven-platform/event';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { OutboxRecord, OutboxRecordId } from '../index.js';

type TenantId = Brand<string, 'TenantId'>;

type WalletId = Brand<string, 'WalletId'>;

type Tenant = TenantReference<'tenant', TenantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface WalletCreatedPayload {
    readonly walletId: WalletId;
}

type WalletCreatedEvent = Event<'WalletCreated', 1, WalletCreatedPayload>;

type WalletCreatedEnvelope = EventEnvelope<
    WalletCreatedEvent,
    'CreateWallet',
    Tenant,
    WalletAggregate
>;

const eventId = 'event-1' as EventId;

const tenantId = 'tenant-1' as TenantId;

const walletId = 'wallet-1' as WalletId;

describe('OutboxRecord', () => {
    it('stores one immutable EventEnvelope', () => {
        const envelope: WalletCreatedEnvelope = {
            eventId,
            eventName: 'WalletCreated',
            schemaVersion: 1,
            occurredAt: '2026-07-18T10:00:00.000Z',
            intentId: 'intent-1',
            correlationId: 'flow-1',
            operationName: 'CreateWallet',
            tenant: {
                type: 'tenant',
                id: tenantId,
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

        const record: OutboxRecord<WalletCreatedEnvelope> = {
            id: eventId,
            envelope,
            createdAt: '2026-07-18T10:00:00.000Z',
        };

        expect(record).toEqual({
            id: 'event-1',
            envelope,
            createdAt: '2026-07-18T10:00:00.000Z',
        });

        expectTypeOf(record.id).toEqualTypeOf<OutboxRecordId>();

        expectTypeOf(record.envelope).toEqualTypeOf<WalletCreatedEnvelope>();

        expectTypeOf(record.envelope.payload).toEqualTypeOf<WalletCreatedPayload>();
    });
});

import { describe, expect, it } from 'vitest';

import type { EventId } from '@event-driven-platform/event';
import type { AnyOutboxRecord, OutboxRecordId } from '@event-driven-platform/outbox';
import type { Brand } from '@event-driven-platform/types';

import type { OutboxStore } from '../index.js';

type TenantId = Brand<string, 'TenantId'>;
type WalletId = Brand<string, 'WalletId'>;

class TestOutboxStore implements OutboxStore {
    readonly records: AnyOutboxRecord[] = [];

    async append(records: readonly AnyOutboxRecord[]): Promise<void> {
        this.records.push(...records);
    }
}

const eventId = 'event-1' as EventId;
const tenantId = 'tenant-1' as TenantId;
const walletId = 'wallet-1' as WalletId;

const record: AnyOutboxRecord = {
    id: eventId as OutboxRecordId,
    envelope: {
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
    },
    createdAt: '2026-07-18T10:00:00.000Z',
};

describe('OutboxStore', () => {
    it('appends Outbox records', async () => {
        const store = new TestOutboxStore();

        await store.append([record]);

        expect(store.records).toEqual([record]);
    });

    it('accepts an empty collection as a no-op', async () => {
        const store = new TestOutboxStore();

        await store.append([]);

        expect(store.records).toEqual([]);
    });

    it('can be implemented without selecting a persistence technology', () => {
        const store: OutboxStore = new TestOutboxStore();

        expect(store).toBeInstanceOf(TestOutboxStore);
    });
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Clock } from '@event-driven-platform/clock';
import type { CommandContext } from '@event-driven-platform/command';
import {
    DefaultEventIdFactory,
    type Event,
    type EventEnvelope,
    type EventId,
} from '@event-driven-platform/event';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import { DefaultOperationEventEnvelopeFactory } from './default-operation-event-envelope-factory.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface WalletCreatedPayload {
    readonly walletId: WalletId;

    readonly currency: string;
}

type WalletCreatedEvent = Event<'wallet.created', 1, WalletCreatedPayload>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface CreateWalletData {
    readonly walletId: WalletId;
}

type CreateWalletResult = SuccessfulOperationResult<CreateWalletData>;

type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

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

const merchantId = 'merchant-1' as MerchantId;

const walletId = 'wallet-1' as WalletId;

const operation: CreateWalletOperation = {
    name: 'CreateWallet',
    schemaVersion: 1,
    intent: {
        id: 'intent-1',
        key: [
            'wallet',
            'create',
            'v1',
            'tenantType=merchant&tenantId=merchant-1',
            'currency=EUR&userId=user-1',
        ].join(':'),
    },
    actor: {
        type: 'user',
        id: 'user-1',
        origin: {
            ipAddress: '127.0.0.1',
            countryCode: 'RS',
            region: 'Belgrade',
            city: 'Belgrade',
            latitude: 44.8125,
            longitude: 20.4612,
            timezone: 'Europe/Belgrade',
            environment: 'test',
            host: 'test-host',
            instance: 'test-instance-1',
        },
    },
    tenant: {
        type: 'merchant',
        id: merchantId,
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
        currency: 'EUR',
    },
};

const context: CommandContext = {
    correlationId: 'register-user-flow-1',
};

const event: WalletCreatedEvent = {
    name: 'wallet.created',
    schemaVersion: 1,
    payload: {
        walletId,
        currency: 'EUR',
    },
};

function createFactory(): DefaultOperationEventEnvelopeFactory {
    return new DefaultOperationEventEnvelopeFactory(
        new FixedClock('2026-07-18T10:00:00.000Z'),
        new DefaultEventIdFactory(),
    );
}

describe('DefaultOperationEventEnvelopeFactory', () => {
    it('creates EventEnvelopes from an Operation and Events', () => {
        const factory = createFactory();

        const envelopes = factory.createMany({
            operation,
            context,
            events: [event],
        });

        expect(envelopes).toEqual([
            {
                eventId: expect.any(String),
                eventName: 'wallet.created',
                schemaVersion: 1,
                occurredAt: '2026-07-18T10:00:00.000Z',
                intentId: 'intent-1',
                correlationId: 'register-user-flow-1',
                operationName: 'CreateWallet',
                tenant: {
                    type: 'merchant',
                    id: 'merchant-1',
                },
                actor: {
                    type: 'user',
                    id: 'user-1',
                    origin: {
                        ipAddress: '127.0.0.1',
                        countryCode: 'RS',
                        region: 'Belgrade',
                        city: 'Belgrade',
                        latitude: 44.8125,
                        longitude: 20.4612,
                        timezone: 'Europe/Belgrade',
                        environment: 'test',
                        host: 'test-host',
                        instance: 'test-instance-1',
                    },
                },
                subject: {
                    type: 'user',
                    id: 'user-1',
                },
                aggregate: {
                    type: 'wallet',
                    id: 'wallet-1',
                },
                payload: {
                    walletId: 'wallet-1',
                    currency: 'EUR',
                },
            },
        ]);

        const envelope = envelopes[0];

        expect(envelope).toBeDefined();

        if (envelope === undefined) {
            throw new Error('Expected one EventEnvelope.');
        }

        expectTypeOf(envelope).toEqualTypeOf<WalletCreatedEnvelope>();

        expectTypeOf(envelope.eventId).toEqualTypeOf<EventId>();

        expectTypeOf(envelope.tenant).toEqualTypeOf<MerchantTenant>();

        expectTypeOf(envelope.aggregate).toEqualTypeOf<WalletAggregate>();
    });

    it('creates the same EventId for the same Event position', () => {
        const factory = createFactory();

        const firstEnvelopes = factory.createMany({
            operation,
            context,
            events: [event],
        });

        const secondEnvelopes = factory.createMany({
            operation,
            context,
            events: [event],
        });

        const first = firstEnvelopes[0];
        const second = secondEnvelopes[0];

        expect(first).toBeDefined();
        expect(second).toBeDefined();

        if (first === undefined || second === undefined) {
            throw new Error('Expected EventEnvelopes.');
        }

        expect(first.eventId).toBe(second.eventId);
    });

    it('creates different EventIds for different Event positions', () => {
        const factory = createFactory();

        const envelopes = factory.createMany({
            operation,
            context,
            events: [event, event],
        });

        const first = envelopes[0];
        const second = envelopes[1];

        expect(first).toBeDefined();
        expect(second).toBeDefined();

        if (first === undefined || second === undefined) {
            throw new Error('Expected two EventEnvelopes.');
        }

        expect(first.eventId).not.toBe(second.eventId);
    });

    it('normalizes missing Actor origin values to null', () => {
        const factory = createFactory();

        const operationWithoutOriginValues: CreateWalletOperation = {
            ...operation,
            actor: {
                type: 'system',
                id: 'wallet-service',
                origin: {},
            },
        };

        const envelopes = factory.createMany({
            operation: operationWithoutOriginValues,
            context,
            events: [event],
        });

        const envelope = envelopes[0];

        expect(envelope).toBeDefined();

        if (envelope === undefined) {
            throw new Error('Expected one EventEnvelope.');
        }

        expect(envelope.actor.origin).toEqual({
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
        });
    });

    it('creates an empty collection for an empty Event collection', () => {
        const factory = createFactory();

        const envelopes = factory.createMany({
            operation,
            context,
            events: [],
        });

        expect(envelopes).toEqual([]);
    });

    it('freezes each created EventEnvelope', () => {
        const factory = createFactory();

        const envelopes = factory.createMany({
            operation,
            context,
            events: [event],
        });

        const envelope = envelopes[0];

        expect(envelope).toBeDefined();

        if (envelope === undefined) {
            throw new Error('Expected one EventEnvelope.');
        }

        expect(Object.isFrozen(envelope)).toBe(true);
    });
});

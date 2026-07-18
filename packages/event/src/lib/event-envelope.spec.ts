import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { Event } from './event.js';
import type { EventEnvelope } from './event-envelope.js';
import type { EventId } from './event-id.js';

type MerchantId = Brand<string, 'MerchantId'>;

type DepositId = Brand<string, 'DepositId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type DepositAggregate = AggregateReference<'deposit', DepositId>;

interface DepositChangedV1Payload {
    readonly depositId: DepositId;

    readonly status: 'pending' | 'approved' | 'rejected';

    readonly reason?: string;
}

type DepositChangedV1 = Event<'deposit.changed', 1, DepositChangedV1Payload>;

type DepositChangedV1Envelope = EventEnvelope<
    DepositChangedV1,
    'ChangeDeposit',
    MerchantTenant,
    DepositAggregate
>;

const eventId = 'event-1' as EventId;

const merchantId = 'merchant-1' as MerchantId;

const depositId = 'deposit-1' as DepositId;

describe('EventEnvelope', () => {
    it('combines an Event with execution and multitenancy context', () => {
        const envelope: DepositChangedV1Envelope = {
            eventId,
            eventName: 'deposit.changed',
            schemaVersion: 1,
            occurredAt: '2026-07-17T10:00:00.000Z',
            intentId: 'intent-1',
            correlationId: 'deposit-processing-flow-1',
            operationName: 'ChangeDeposit',
            tenant: {
                type: 'merchant',
                id: merchantId,
            },
            actor: {
                type: 'system',
                id: 'payment-service',
                origin: {
                    ipAddress: null,
                    countryCode: null,
                    region: null,
                    city: null,
                    latitude: null,
                    longitude: null,
                    timezone: null,
                    environment: 'production',
                    host: 'payment-worker',
                    instance: 'payment-worker-1',
                },
            },
            subject: {
                type: 'user',
                id: 'user-1',
            },
            aggregate: {
                type: 'deposit',
                id: depositId,
            },
            payload: {
                depositId,
                status: 'approved',
            },
        };

        expect(envelope).toEqual({
            eventId: 'event-1',
            eventName: 'deposit.changed',
            schemaVersion: 1,
            occurredAt: '2026-07-17T10:00:00.000Z',
            intentId: 'intent-1',
            correlationId: 'deposit-processing-flow-1',
            operationName: 'ChangeDeposit',
            tenant: {
                type: 'merchant',
                id: 'merchant-1',
            },
            actor: {
                type: 'system',
                id: 'payment-service',
                origin: {
                    ipAddress: null,
                    countryCode: null,
                    region: null,
                    city: null,
                    latitude: null,
                    longitude: null,
                    timezone: null,
                    environment: 'production',
                    host: 'payment-worker',
                    instance: 'payment-worker-1',
                },
            },
            subject: {
                type: 'user',
                id: 'user-1',
            },
            aggregate: {
                type: 'deposit',
                id: 'deposit-1',
            },
            payload: {
                depositId: 'deposit-1',
                status: 'approved',
            },
        });

        expectTypeOf(envelope.eventId).toEqualTypeOf<EventId>();

        expectTypeOf(envelope.eventName).toEqualTypeOf<'deposit.changed'>();

        expectTypeOf(envelope.schemaVersion).toEqualTypeOf<1>();

        expectTypeOf(envelope.operationName).toEqualTypeOf<'ChangeDeposit'>();

        expectTypeOf(envelope.tenant).toEqualTypeOf<MerchantTenant>();

        expectTypeOf(envelope.tenant.type).toEqualTypeOf<'merchant'>();

        expectTypeOf(envelope.tenant.id).toEqualTypeOf<MerchantId>();

        expectTypeOf(envelope.aggregate).toEqualTypeOf<DepositAggregate>();

        expectTypeOf(envelope.aggregate.type).toEqualTypeOf<'deposit'>();

        expectTypeOf(envelope.aggregate.id).toEqualTypeOf<DepositId>();

        expectTypeOf(envelope.payload).toEqualTypeOf<DepositChangedV1Payload>();

        expectTypeOf(envelope.actor.origin.ipAddress).toEqualTypeOf<string | null>();
    });
});

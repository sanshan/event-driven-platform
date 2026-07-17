import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Event } from './event.js';
import type { EventEnvelope } from './event-envelope.js';

interface DepositChangedV1Payload {
    readonly depositId: string;

    readonly status: 'pending' | 'approved' | 'rejected';

    readonly reason?: string;
}

type DepositChangedV1 = Event<'deposit.changed', 1, DepositChangedV1Payload>;

type DepositChangedV1Envelope = EventEnvelope<DepositChangedV1, 'ChangeDeposit'>;

describe('EventEnvelope', () => {
    it('combines an Event with execution and multitenancy context', () => {
        const envelope: DepositChangedV1Envelope = {
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

        expectTypeOf(envelope.eventName).toEqualTypeOf<'deposit.changed'>();

        expectTypeOf(envelope.schemaVersion).toEqualTypeOf<1>();

        expectTypeOf(envelope.operationName).toEqualTypeOf<'ChangeDeposit'>();

        expectTypeOf(envelope.payload).toEqualTypeOf<DepositChangedV1Payload>();

        expectTypeOf(envelope.actor.origin.ipAddress).toEqualTypeOf<string | null>();
    });
});

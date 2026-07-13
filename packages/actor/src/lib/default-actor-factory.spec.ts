import {describe, expect, it} from 'vitest';

import {DefaultActorFactory} from './default-actor-factory.js';

describe('DefaultActorFactory', () => {
    const factory = new DefaultActorFactory();

    it('creates an Actor from descriptor', () => {
        const actor = factory.create({
            type: 'user',
            id: 'user-1',
            origin: {
                ipAddress: '203.0.113.10',
                countryCode: 'RS',
                region: 'Belgrade',
                city: 'Belgrade',
                latitude: 44.8176,
                longitude: 20.4633,
                timezone: 'Europe/Belgrade',
            },
        });

        expect(actor).toEqual({
            type: 'user',
            id: 'user-1',
            origin: {
                ipAddress: '203.0.113.10',
                countryCode: 'RS',
                region: 'Belgrade',
                city: 'Belgrade',
                latitude: 44.8176,
                longitude: 20.4633,
                timezone: 'Europe/Belgrade',
            },
        });
    });

    it('creates an Actor with an empty origin', () => {
        const actor = factory.create({
            type: 'system',
            id: 'wallet-reconciliation',
            origin: {},
        });

        expect(actor).toEqual({
            type: 'system',
            id: 'wallet-reconciliation',
            origin: {},
        });
    });

    it('creates a defensive copy of origin', () => {
        const origin = {
            environment: 'production',
            host: 'worker-01',
            instance: 'payment-service-01',
        };

        const actor = factory.create({
            type: 'service',
            id: 'payment-service',
            origin,
        });

        expect(actor.origin).not.toBe(origin);
        expect(actor.origin).toEqual(origin);
    });

    it('does not change when descriptor origin changes', () => {
        const origin = {
            environment: 'production',
        };

        const actor = factory.create({
            type: 'service',
            id: 'payment-service',
            origin,
        });

        origin.environment = 'development';

        expect(actor.origin.environment).toBe('production');
    });

    it('returns an immutable Actor', () => {
        const actor = factory.create({
            type: 'scheduler',
            id: 'expire-pending-payments',
            origin: {
                environment: 'production',
            },
        });

        expect(Object.isFrozen(actor)).toBe(true);
        expect(Object.isFrozen(actor.origin)).toBe(true);
    });

    it.each([
        'user',
        'service',
        'system',
        'scheduler',
    ] as const)('creates an Actor with type "%s"', (type) => {
        const actor = factory.create({
            type,
            id: 'actor-1',
            origin: {},
        });

        expect(actor.type).toBe(type);
    });
});
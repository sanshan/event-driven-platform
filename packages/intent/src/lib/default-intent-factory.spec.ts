import { describe, expect, it } from 'vitest';

import { DefaultIntentFactory } from './default-intent-factory.js';

describe('DefaultIntentFactory', () => {
    const factory = new DefaultIntentFactory();

    it('creates an Intent with a canonical key', () => {
        const intent = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'EUR',
            },
        });

        expect(intent.key).toBe('wallet:create:v1:currency=EUR&tenantId=tenant-1&userId=user-1');

        expect(intent.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
    });

    it('creates the same Intent for the same descriptor', () => {
        const first = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'EUR',
            },
        });

        const second = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'EUR',
            },
        });

        expect(second).toEqual(first);
    });

    it('does not depend on component insertion order', () => {
        const first = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'EUR',
            },
        });

        const second = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                currency: 'EUR',
                userId: 'user-1',
                tenantId: 'tenant-1',
            },
        });

        expect(second.key).toBe(first.key);
        expect(second.id).toBe(first.id);
    });

    it('creates different ids for different business intentions', () => {
        const euroWallet = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'EUR',
            },
        });

        const usdWallet = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                currency: 'USD',
            },
        });

        expect(usdWallet.id).not.toBe(euroWallet.id);
    });

    it('encodes component names and values', () => {
        const intent = factory.create({
            namespace: 'webhook',
            action: 'process',
            version: 1,
            components: {
                externalId: 'provider/event=42',
            },
        });

        expect(intent.key).toBe('webhook:process:v1:externalId=provider%2Fevent%3D42');
    });

    it('returns an immutable Intent', () => {
        const intent = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            components: {
                tenantId: 'tenant-1',
            },
        });

        expect(Object.isFrozen(intent)).toBe(true);
    });
});

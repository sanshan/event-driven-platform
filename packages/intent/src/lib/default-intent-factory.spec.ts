import { describe, expect, expectTypeOf, it } from 'vitest';
import { ZodError } from 'zod';

import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import { DefaultIntentFactory } from './default-intent-factory.js';
import type { Intent, IntentDescriptor } from './intent.js';

type MerchantId = Brand<string, 'MerchantId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

const tenant: MerchantTenant = {
    type: 'merchant',
    id: 'merchant-1' as MerchantId,
};

function createDescriptor(overrides: Partial<IntentDescriptor> = {}): IntentDescriptor {
    return {
        namespace: 'wallet',
        action: 'create',
        version: 1,
        tenant,
        components: {
            currency: 'EUR',
            userId: 'user-1',
        },
        ...overrides,
    };
}

describe('DefaultIntentFactory', () => {
    it('creates a deterministic Intent', () => {
        const factory = new DefaultIntentFactory();

        const intent = factory.create(createDescriptor());

        expect(intent).toEqual({
            id: '7928aa88-6bda-55cb-b7ad-58d654b73644',
            key: [
                'wallet',
                'create',
                'v1',
                'tenantType=merchant&tenantId=merchant-1',
                'currency=EUR&userId=user-1',
            ].join(':'),
        });

        expectTypeOf(intent).toEqualTypeOf<Intent>();
        expect(Object.isFrozen(intent)).toBe(true);
    });

    it('creates the same Intent for the same descriptor', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(createDescriptor());

        const second = factory.create(createDescriptor());

        expect(first).toEqual(second);
    });

    it('builds the same Intent regardless of component order', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(
            createDescriptor({
                components: {
                    currency: 'EUR',
                    userId: 'user-1',
                },
            }),
        );

        const second = factory.create(
            createDescriptor({
                components: {
                    userId: 'user-1',
                    currency: 'EUR',
                },
            }),
        );

        expect(first).toEqual(second);
    });

    it('creates different Intent identities for different tenants', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(
            createDescriptor({
                tenant: {
                    type: 'merchant',
                    id: 'merchant-1' as MerchantId,
                },
            }),
        );

        const second = factory.create(
            createDescriptor({
                tenant: {
                    type: 'merchant',
                    id: 'merchant-2' as MerchantId,
                },
            }),
        );

        expect(first.key).not.toBe(second.key);
        expect(first.id).not.toBe(second.id);
    });

    it('creates different Intent identities for different tenant types', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(
            createDescriptor({
                tenant: {
                    type: 'merchant',
                    id: 'tenant-1' as MerchantId,
                },
            }),
        );

        const second = factory.create(
            createDescriptor({
                tenant: {
                    type: 'organization',
                    id: 'tenant-1' as MerchantId,
                },
            }),
        );

        expect(first.key).not.toBe(second.key);
        expect(first.id).not.toBe(second.id);
    });

    it('creates different Intent identities for different business components', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(
            createDescriptor({
                components: {
                    currency: 'EUR',
                    userId: 'user-1',
                },
            }),
        );

        const second = factory.create(
            createDescriptor({
                components: {
                    currency: 'USD',
                    userId: 'user-1',
                },
            }),
        );

        expect(first.key).not.toBe(second.key);
        expect(first.id).not.toBe(second.id);
    });

    it('creates different Intent identities for different versions', () => {
        const factory = new DefaultIntentFactory();

        const first = factory.create(
            createDescriptor({
                version: 1,
            }),
        );

        const second = factory.create(
            createDescriptor({
                version: 2,
            }),
        );

        expect(first.key).not.toBe(second.key);
        expect(first.id).not.toBe(second.id);
    });

    it('encodes tenant and component values', () => {
        const factory = new DefaultIntentFactory();

        const intent = factory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            tenant: {
                type: 'merchant group',
                id: 'merchant/1' as MerchantId,
            },
            components: {
                externalId: 'user/1',
                currency: 'EUR + bonus',
            },
        });

        expect(intent.key).toBe(
            [
                'wallet',
                'create',
                'v1',
                'tenantType=merchant%20group&tenantId=merchant%2F1',
                'currency=EUR%20%2B%20bonus&externalId=user%2F1',
            ].join(':'),
        );
    });

    it('rejects an empty tenant type', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    tenant: {
                        type: '',
                        id: 'merchant-1' as MerchantId,
                    },
                }),
            ),
        ).toThrow();
    });

    it('rejects an empty tenant identifier', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    tenant: {
                        type: 'merchant',
                        id: '' as MerchantId,
                    },
                }),
            ),
        ).toThrow();
    });

    it('rejects tenant values with surrounding whitespace', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    tenant: {
                        type: ' merchant',
                        id: 'merchant-1' as MerchantId,
                    },
                }),
            ),
        ).toThrow();

        expect(() =>
            factory.create(
                createDescriptor({
                    tenant: {
                        type: 'merchant',
                        id: 'merchant-1 ' as MerchantId,
                    },
                }),
            ),
        ).toThrow();
    });

    it('rejects an empty component collection', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    components: {},
                }),
            ),
        ).toThrow('Intent must contain at least one component.');
    });

    it('rejects an invalid namespace', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    namespace: 'Wallet',
                }),
            ),
        ).toThrow();
    });

    it('rejects an invalid action', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    action: 'createWallet',
                }),
            ),
        ).toThrow();
    });

    it('rejects a non-positive version', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    version: 0,
                }),
            ),
        ).toThrow();
    });

    it('rejects a non-integer version', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    version: 1.5,
                }),
            ),
        ).toThrow();
    });

    it('rejects invalid component names', () => {
        const factory = new DefaultIntentFactory();

        let thrownError: unknown;

        try {
            factory.create(
                createDescriptor({
                    components: {
                        'user-id': 'user-1',
                    },
                }),
            );
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(ZodError);

        if (!(thrownError instanceof ZodError)) {
            throw new Error('Expected ZodError.');
        }

        expect(thrownError.issues).toContainEqual({
            code: 'custom',
            path: ['components', 'user-id'],
            message: 'Intent component name "user-id" must use camelCase.',
        });
    });

    it('rejects empty component values', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    components: {
                        userId: '',
                    },
                }),
            ),
        ).toThrow();
    });

    it('rejects component values with surrounding whitespace', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.create(
                createDescriptor({
                    components: {
                        userId: ' user-1',
                    },
                }),
            ),
        ).toThrow();
    });
});

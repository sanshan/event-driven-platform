import { describe, expect, expectTypeOf, it } from 'vitest';
import { ZodError } from 'zod';

import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import { IntentFactory } from './intent-factory.js';
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

describe('IntentFactory', () => {
    it('creates the same deterministic Intent as the previous canonical contract', () => {
        const intent = IntentFactory.create(createDescriptor());

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

    it('creates the same Intent for the same descriptor regardless of component order', () => {
        const first = IntentFactory.create(createDescriptor());
        const replay = IntentFactory.create(
            createDescriptor({
                components: {
                    userId: 'user-1',
                    currency: 'EUR',
                },
            }),
        );

        expect(replay).toEqual(first);
    });

    it('changes identity when tenant, business components, or version change', () => {
        const base = IntentFactory.create(createDescriptor());
        const differentTenant = IntentFactory.create(
            createDescriptor({
                tenant: {
                    type: 'merchant',
                    id: 'merchant-2' as MerchantId,
                },
            }),
        );
        const differentTenantType = IntentFactory.create(
            createDescriptor({
                tenant: {
                    type: 'organization',
                    id: 'merchant-1' as MerchantId,
                },
            }),
        );
        const differentComponent = IntentFactory.create(
            createDescriptor({
                components: {
                    currency: 'USD',
                    userId: 'user-1',
                },
            }),
        );
        const differentVersion = IntentFactory.create(createDescriptor({ version: 2 }));

        for (const intent of [
            differentTenant,
            differentTenantType,
            differentComponent,
            differentVersion,
        ]) {
            expect(intent.key).not.toBe(base.key);
            expect(intent.id).not.toBe(base.id);
        }
    });

    it('encodes tenant and component values canonically', () => {
        const intent = IntentFactory.create({
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

    it.each([
        ['empty tenant type', { tenant: { type: '', id: 'merchant-1' as MerchantId } }],
        ['empty tenant id', { tenant: { type: 'merchant', id: '' as MerchantId } }],
        ['invalid namespace', { namespace: 'Wallet' }],
        ['invalid action', { action: 'createWallet' }],
        ['non-positive version', { version: 0 }],
        ['non-integer version', { version: 1.5 }],
        ['empty components', { components: {} }],
        ['empty component value', { components: { userId: '' } }],
    ] satisfies ReadonlyArray<readonly [string, Partial<IntentDescriptor>]>)('rejects %s', (_name, overrides) => {
        expect(() => IntentFactory.create(createDescriptor(overrides))).toThrow();
    });

    it('rejects tenant and component values with surrounding whitespace', () => {
        expect(() =>
            IntentFactory.create(
                createDescriptor({
                    tenant: {
                        type: ' merchant',
                        id: 'merchant-1' as MerchantId,
                    },
                }),
            ),
        ).toThrow();
        expect(() =>
            IntentFactory.create(
                createDescriptor({
                    tenant: {
                        type: 'merchant',
                        id: 'merchant-1 ' as MerchantId,
                    },
                }),
            ),
        ).toThrow();
        expect(() =>
            IntentFactory.create(
                createDescriptor({
                    components: {
                        userId: ' user-1',
                    },
                }),
            ),
        ).toThrow();
    });

    it('preserves detailed validation errors for invalid component names', () => {
        let thrownError: unknown;

        try {
            IntentFactory.create(
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
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Brand } from '@event-driven-platform/types';

import { DefaultTenantReferenceFactory, type TenantReference } from '../index.js';

type MerchantId = Brand<string, 'MerchantId'>;

describe('TenantReference', () => {
    it('identifies one tenant boundary', () => {
        const tenant: TenantReference<'merchant', MerchantId> = {
            type: 'merchant',
            id: 'merchant-1' as MerchantId,
        };

        expect(tenant).toEqual({
            type: 'merchant',
            id: 'merchant-1',
        });

        expectTypeOf(tenant.type).toEqualTypeOf<'merchant'>();

        expectTypeOf(tenant.id).toEqualTypeOf<MerchantId>();
    });
});

describe('DefaultTenantReferenceFactory', () => {
    it('creates an immutable TenantReference', () => {
        const factory = new DefaultTenantReferenceFactory();

        const tenant = factory.create({
            type: 'merchant' as const,
            id: 'merchant-1' as MerchantId,
        });

        expect(tenant).toEqual({
            type: 'merchant',
            id: 'merchant-1',
        });

        expect(Object.isFrozen(tenant)).toBe(true);

        expectTypeOf(tenant).toEqualTypeOf<TenantReference<'merchant', MerchantId>>();
    });

    it('rejects an empty tenant type', () => {
        const factory = new DefaultTenantReferenceFactory();

        expect(() =>
            factory.create({
                type: '',
                id: 'merchant-1' as MerchantId,
            }),
        ).toThrow();
    });

    it('rejects an empty tenant identifier', () => {
        const factory = new DefaultTenantReferenceFactory();

        expect(() =>
            factory.create({
                type: 'merchant',
                id: '' as MerchantId,
            }),
        ).toThrow();
    });
});

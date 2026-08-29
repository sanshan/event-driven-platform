import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Actor } from '@event-driven-platform/actor';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { Read, ReadResultOf } from './read.js';

type MerchantId = Brand<string, 'MerchantId'>;
type WalletId = Brand<string, 'WalletId'>;
type MerchantTenant = TenantReference<'merchant', MerchantId>;

interface GetWalletParameters {
    readonly walletId: WalletId;
}

interface WalletView {
    readonly id: WalletId;
    readonly currency: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', MerchantTenant, GetWalletParameters, WalletView>;

describe('Read', () => {
    it('describes a tenant-scoped business request for information', () => {
        const actor: Actor = {
            type: 'user',
            id: 'user-1',
            origin: {},
        };
        const tenant: MerchantTenant = {
            type: 'merchant',
            id: 'merchant-1' as MerchantId,
        };
        const walletId = 'wallet-1' as WalletId;

        const read: GetWalletRead = {
            name: 'wallet.get',
            actor,
            tenant,
            parameters: {
                walletId,
            },
        };

        expect(read).toEqual({
            name: 'wallet.get',
            actor,
            tenant,
            parameters: {
                walletId: 'wallet-1',
            },
        });

        expectTypeOf(read.name).toEqualTypeOf<'wallet.get'>();
        expectTypeOf(read.tenant).toEqualTypeOf<MerchantTenant>();
        expectTypeOf(read.parameters).toEqualTypeOf<GetWalletParameters>();
        expectTypeOf(read.parameters.walletId).toEqualTypeOf<WalletId>();
    });

    it('associates the Read with its result type', () => {
        expectTypeOf<ReadResultOf<GetWalletRead>>().toEqualTypeOf<WalletView>();
    });
});

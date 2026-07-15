import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Actor } from '@event-driven-platform/actor';
import type { Brand } from '@event-driven-platform/types';

import type { Read, ReadResultOf } from './read.js';

type WalletId = Brand<string, 'WalletId'>;

interface GetWalletParameters {
    readonly walletId: WalletId;
}

interface WalletView {
    readonly id: WalletId;
    readonly currency: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', GetWalletParameters, WalletView>;

describe('Read', () => {
    it('describes a business request for information', () => {
        const actor: Actor = {
            type: 'user',
            id: 'user-1',
            origin: {},
        };

        const walletId = 'wallet-1' as WalletId;

        const read: GetWalletRead = {
            name: 'wallet.get',
            actor,
            parameters: {
                walletId,
            },
        };

        expect(read).toEqual({
            name: 'wallet.get',
            actor,
            parameters: {
                walletId: 'wallet-1',
            },
        });

        expectTypeOf(read.name).toEqualTypeOf<'wallet.get'>();

        expectTypeOf(read.parameters).toEqualTypeOf<GetWalletParameters>();

        expectTypeOf(read.parameters.walletId).toEqualTypeOf<WalletId>();
    });

    it('associates the Read with its result type', () => {
        expectTypeOf<ReadResultOf<GetWalletRead>>().toEqualTypeOf<WalletView>();
    });
});

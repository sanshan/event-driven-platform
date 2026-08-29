import { describe, expectTypeOf, it } from 'vitest';

import type { AnyRead, Read } from '@event-driven-platform/read';

import type { ReadHandler } from './read-handler.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<
    'wallet.get',
    AnyRead['tenant'],
    { readonly walletId: string },
    WalletView
>;

describe('ReadHandler', () => {
    it('binds execution result to the Read result type', () => {
        type Handler = ReadHandler<GetWalletRead>;
        type Result = Awaited<ReturnType<Handler['execute']>>;

        expectTypeOf<Result>().toEqualTypeOf<WalletView>();
        expectTypeOf<Parameters<Handler['execute']>[0]['tenant']>().toEqualTypeOf<
            AnyRead['tenant']
        >();
    });
});

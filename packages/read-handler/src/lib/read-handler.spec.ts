import { describe, expectTypeOf, it } from 'vitest';

import type { Read } from '@event-driven-platform/read';

import type { ReadHandler } from './read-handler.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;

describe('ReadHandler', () => {
    it('binds execution result to the Read result type', () => {
        type Handler = ReadHandler<GetWalletRead>;
        type Result = Awaited<ReturnType<Handler['execute']>>;

        expectTypeOf<Result>().toEqualTypeOf<WalletView>();
    });
});

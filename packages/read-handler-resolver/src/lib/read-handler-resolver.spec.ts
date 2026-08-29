import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AnyRead, Read } from '@event-driven-platform/read';
import type { ReadHandler } from '@event-driven-platform/read-handler';

import type {
    ReadHandlerResolution,
    ReadHandlerResolver,
} from './read-handler-resolver.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type WalletTenant = Omit<AnyRead['tenant'], 'type'> & { readonly type: 'merchant' };
type GetWalletRead = Read<
    'wallet.get',
    WalletTenant,
    { readonly walletId: string },
    WalletView
>;

describe('ReadHandlerResolver', () => {
    it('supports one-or-more typed handlers in deterministic order', () => {
        const first: ReadHandler<GetWalletRead> = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };
        const second: ReadHandler<GetWalletRead> = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };

        const resolution: ReadHandlerResolution<GetWalletRead> = {
            status: 'resolved',
            handlers: [first, second],
        };

        expect(resolution.handlers).toEqual([first, second]);
        expectTypeOf(resolution.handlers[0]).toEqualTypeOf<ReadHandler<GetWalletRead>>();
    });

    it('makes missing and ambiguous resolution explicit', () => {
        const missing: ReadHandlerResolution<GetWalletRead> = {
            status: 'not-found',
        };
        const ambiguous: ReadHandlerResolution<GetWalletRead> = {
            status: 'ambiguous',
            reason: 'multiple incompatible handler sets',
        };

        expect(missing.status).toBe('not-found');
        expect(ambiguous).toEqual({
            status: 'ambiguous',
            reason: 'multiple incompatible handler sets',
        });
    });

    it('binds resolver output to the complete input Read type', () => {
        const resolver: ReadHandlerResolver = {
            resolve: <TRead extends AnyRead>(_read: TRead): ReadHandlerResolution<TRead> => ({
                status: 'not-found',
            }),
        };

        const read = {} as GetWalletRead;
        const resolution = resolver.resolve(read);

        expectTypeOf(resolution).toEqualTypeOf<ReadHandlerResolution<GetWalletRead>>();
        expectTypeOf<GetWalletRead['tenant']>().toEqualTypeOf<WalletTenant>();
    });
});

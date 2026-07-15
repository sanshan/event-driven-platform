import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Actor } from '@event-driven-platform/actor';
import type { Read } from '@event-driven-platform/read';
import type { Brand } from '@event-driven-platform/types';

import type { Query, QueryResultOf } from './query.js';

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

type GetWalletQuery = Query<GetWalletRead>;

describe('Query', () => {
    it('carries a Read, execution context and execution options', () => {
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

        const query: GetWalletQuery = {
            read,
            context: {
                correlationId: 'get-wallet-flow-1',
            },
            options: {
                timeoutMs: 5_000,
            },
        };

        expect(query).toEqual({
            read,
            context: {
                correlationId: 'get-wallet-flow-1',
            },
            options: {
                timeoutMs: 5_000,
            },
        });

        expectTypeOf(query.read).toEqualTypeOf<GetWalletRead>();

        expectTypeOf(query.context.correlationId).toEqualTypeOf<string>();
    });

    it('preserves the result type defined by Read', () => {
        expectTypeOf<QueryResultOf<GetWalletQuery>>().toEqualTypeOf<WalletView>();
    });
});

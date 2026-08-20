import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Query } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import {
    DefaultReader,
    ReadHandlerAmbiguousError,
    ReadHandlerNotFoundError,
    ReadTimedOutError,
    type ReadTimeout,
    type Reader,
} from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

const query: GetWalletQuery = {
    read: {
        name: 'wallet.get',
        actor: {
            type: 'user',
            id: 'user-1',
            origin: {},
        },
        parameters: { walletId: 'wallet-1' },
    },
    context: {
        correlationId: 'correlation-1',
    },
};

function resolverWith(
    resolution: ReadHandlerResolution<GetWalletRead>,
): ReadHandlerResolver {
    return {
        resolve: <TRead extends Read<string, unknown, unknown>>(_read: TRead) =>
            resolution as unknown as ReadHandlerResolution<TRead>,
    };
}

describe('DefaultReader', () => {
    it('executes a no-cache Query through the first resolved handler and preserves result typing', async () => {
        const first = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };
        const second = {
            execute: async () => ({ id: 'wallet-1', balance: 20 }),
        };
        const reader: Reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [first, second],
            }),
        });

        const result = await reader.execute(query);

        expect(result).toEqual({ id: 'wallet-1', balance: 10 });
        expectTypeOf(result).toEqualTypeOf<WalletView>();
    });

    it('fails deterministically when no handler is resolved', async () => {
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        await expect(reader.execute(query)).rejects.toBeInstanceOf(ReadHandlerNotFoundError);
    });

    it('fails deterministically when handler resolution is ambiguous', async () => {
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'ambiguous',
                reason: 'multiple incompatible handler sets',
            }),
        });

        await expect(reader.execute(query)).rejects.toEqual(
            new ReadHandlerAmbiguousError('multiple incompatible handler sets'),
        );
    });

    it('applies Query timeout to handler execution', async () => {
        const handler = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };
        const readTimeout: ReadTimeout = {
            execute: async () => ({ type: 'timed-out' }),
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readTimeout,
        });
        const timedQuery: GetWalletQuery = {
            ...query,
            options: { timeoutMs: 25 },
        };

        await expect(reader.execute(timedQuery)).rejects.toEqual(new ReadTimedOutError(25));
    });
});

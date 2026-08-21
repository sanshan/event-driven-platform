import { describe, expect, it } from 'vitest';

import type {
    CacheReader,
    CacheWriter,
    Query,
    QueryCacheLevel,
    ReadCacheKey,
} from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader } from './reader/default-reader.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};

const baseQuery: Omit<GetWalletQuery, 'options'> = {
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

function cacheLevel(
    reader: CacheReader<WalletView>,
    writer?: CacheWriter<WalletView>,
): QueryCacheLevel<WalletView> {
    return {
        scope: 'local',
        reader,
        writer,
    };
}

function cachedQuery(levels: readonly [QueryCacheLevel<WalletView>, ...QueryCacheLevel<WalletView>[]]): GetWalletQuery {
    return {
        ...baseQuery,
        options: {
            cache: {
                key,
                levels,
            },
        },
    };
}

describe('DefaultReader cache execution', () => {
    it('traverses levels in declared order and stops at the first hit', async () => {
        const calls: string[] = [];
        const l1 = cacheLevel({
            read: async () => {
                calls.push('l1-read');
                return { status: 'miss' };
            },
        });
        const l2 = cacheLevel({
            read: async () => {
                calls.push('l2-read');
                return { status: 'hit', value: { id: 'wallet-1', balance: 20 } };
            },
        });
        const l3 = cacheLevel({
            read: async () => {
                calls.push('l3-read');
                return { status: 'hit', value: { id: 'wallet-1', balance: 30 } };
            },
        });
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        const result = await reader.execute(cachedQuery([l1, l2, l3]));

        expect(result).toEqual({ id: 'wallet-1', balance: 20 });
        expect(calls).toEqual(['l1-read', 'l2-read']);
    });

    it('promotes a lower-level hit into preceding writable levels in reverse order', async () => {
        const calls: string[] = [];
        const l1 = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async () => {
                    calls.push('l1-write');
                },
            },
        );
        const l2 = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async () => {
                    calls.push('l2-write');
                },
            },
        );
        const l3 = cacheLevel({
            read: async () => ({ status: 'hit', value: { id: 'wallet-1', balance: 30 } }),
        });
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        await reader.execute(cachedQuery([l1, l2, l3]));

        expect(calls).toEqual(['l2-write', 'l1-write']);
    });

    it('executes the source after a full miss and backfills writable levels in reverse order', async () => {
        const calls: string[] = [];
        const l1 = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async (_key, value) => {
                    calls.push(`l1-write:${value.balance}`);
                },
            },
        );
        const l2 = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async (_key, value) => {
                    calls.push(`l2-write:${value.balance}`);
                },
            },
        );
        const handler = {
            execute: async () => {
                calls.push('source');
                return { id: 'wallet-1', balance: 40 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        const result = await reader.execute(cachedQuery([l1, l2]));

        expect(result).toEqual({ id: 'wallet-1', balance: 40 });
        expect(calls).toEqual(['source', 'l2-write:40', 'l1-write:40']);
    });

    it('continues traversal when a cache reader reports or throws an error', async () => {
        const explicitError = cacheLevel({
            read: async () => ({ status: 'error', error: new Error('cache unavailable') }),
        });
        const thrownError = cacheLevel({
            read: async () => {
                throw new Error('cache transport failed');
            },
        });
        const hit = cacheLevel({
            read: async () => ({ status: 'hit', value: { id: 'wallet-1', balance: 50 } }),
        });
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        const result = await reader.execute(cachedQuery([explicitError, thrownError, hit]));

        expect(result).toEqual({ id: 'wallet-1', balance: 50 });
    });

    it('does not replace a successful cache hit when promotion writers fail', async () => {
        const failingWriter = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async () => {
                    throw new Error('promotion failed');
                },
            },
        );
        const hit = cacheLevel({
            read: async () => ({ status: 'hit', value: { id: 'wallet-1', balance: 60 } }),
        });
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        await expect(reader.execute(cachedQuery([failingWriter, hit]))).resolves.toEqual({
            id: 'wallet-1',
            balance: 60,
        });
    });

    it('does not replace a successful source result when backfill writers fail', async () => {
        const failingWriter = cacheLevel(
            { read: async () => ({ status: 'miss' }) },
            {
                write: async () => {
                    throw new Error('backfill failed');
                },
            },
        );
        const handler = {
            execute: async () => ({ id: 'wallet-1', balance: 70 }),
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        await expect(reader.execute(cachedQuery([failingWriter]))).resolves.toEqual({
            id: 'wallet-1',
            balance: 70,
        });
    });

    it('propagates source-handler failure after all cache levels miss', async () => {
        const miss = cacheLevel({ read: async () => ({ status: 'miss' }) });
        const sourceError = new Error('source failed');
        const handler = {
            execute: async (): Promise<WalletView> => {
                throw sourceError;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        await expect(reader.execute(cachedQuery([miss]))).rejects.toBe(sourceError);
    });
});

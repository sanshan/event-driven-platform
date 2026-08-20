import { describe, expect, it } from 'vitest';

import type { Query, QueryCacheLevel, ReadCacheKey } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader, ReadTimedOutError, type ReadTimeout } from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

function resolverWith(
    resolution: ReadHandlerResolution<GetWalletRead>,
): ReadHandlerResolver {
    return {
        resolve: <TRead extends Read<string, unknown, unknown>>(_read: TRead) =>
            resolution as unknown as ReadHandlerResolution<TRead>,
    };
}

function deferred<TResult>() {
    let resolve!: (value: TResult) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<TResult>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });

    return { promise, resolve, reject };
}

function queryFor(
    walletId: string,
    keyValue = `wallet:${walletId}`,
    timeoutMs?: number,
): GetWalletQuery {
    const key: ReadCacheKey = {
        namespace: 'wallet.get',
        version: '1',
        partition: 'tenant:tenant-1',
        value: keyValue,
    };
    const sharedMiss: QueryCacheLevel<WalletView> = {
        scope: 'shared',
        reader: {
            read: async () => ({ status: 'miss' }),
        },
    };

    return {
        read: {
            name: 'wallet.get',
            actor: {
                type: 'user',
                id: 'user-1',
                origin: {},
            },
            parameters: { walletId },
        },
        context: {
            correlationId: `correlation:${walletId}`,
        },
        options: {
            ...(timeoutMs === undefined ? {} : { timeoutMs }),
            cache: {
                key,
                levels: [sharedMiss],
            },
        },
    };
}

describe('DefaultReader process-local inflight', () => {
    it('collapses identical same-instance keys to one shared traversal and source execution', async () => {
        const source = deferred<WalletView>();
        let sharedReads = 0;
        let sourceExecutions = 0;
        const query = queryFor('wallet-1');
        const sharedLevel = query.options?.cache?.levels[0];

        if (sharedLevel === undefined) {
            throw new Error('test cache level is missing');
        }

        const coalescedQuery: GetWalletQuery = {
            ...query,
            options: {
                ...query.options,
                cache: {
                    ...query.options?.cache,
                    key: query.options!.cache!.key,
                    levels: [
                        {
                            ...sharedLevel,
                            reader: {
                                read: async () => {
                                    sharedReads += 1;
                                    return { status: 'miss' };
                                },
                            },
                        },
                    ],
                },
            },
        };
        const handler = {
            execute: async () => {
                sourceExecutions += 1;
                return source.promise;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        const requests = Array.from({ length: 50 }, () => reader.execute(coalescedQuery));

        await Promise.resolve();
        await Promise.resolve();

        expect(sharedReads).toBe(1);
        expect(sourceExecutions).toBe(1);

        source.resolve({ id: 'wallet-1', balance: 10 });

        await expect(Promise.all(requests)).resolves.toEqual(
            Array.from({ length: 50 }, () => ({ id: 'wallet-1', balance: 10 })),
        );
    });

    it('does not serialize unrelated keys behind each other', async () => {
        const first = deferred<WalletView>();
        const second = deferred<WalletView>();
        const started: string[] = [];
        const handler = {
            execute: async (read: GetWalletRead) => {
                started.push(read.parameters.walletId);
                return read.parameters.walletId === 'wallet-1' ? first.promise : second.promise;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        const firstRequest = reader.execute(queryFor('wallet-1'));
        const secondRequest = reader.execute(queryFor('wallet-2'));

        await Promise.resolve();
        await Promise.resolve();

        expect(started).toEqual(['wallet-1', 'wallet-2']);

        first.resolve({ id: 'wallet-1', balance: 10 });
        second.resolve({ id: 'wallet-2', balance: 20 });

        await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
            { id: 'wallet-1', balance: 10 },
            { id: 'wallet-2', balance: 20 },
        ]);
    });

    it('cleans failed flights so a later request can become the next leader', async () => {
        const sourceError = new Error('source failed');
        let sourceExecutions = 0;
        const handler = {
            execute: async () => {
                sourceExecutions += 1;
                if (sourceExecutions === 1) {
                    throw sourceError;
                }

                return { id: 'wallet-1', balance: 30 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });
        const query = queryFor('wallet-1');

        const first = reader.execute(query);
        const follower = reader.execute(query);

        await expect(first).rejects.toBe(sourceError);
        await expect(follower).rejects.toBe(sourceError);
        expect(sourceExecutions).toBe(1);

        await expect(reader.execute(query)).resolves.toEqual({ id: 'wallet-1', balance: 30 });
        expect(sourceExecutions).toBe(2);
    });

    it('allows callers with different timeouts to await the same flight independently', async () => {
        const source = deferred<WalletView>();
        let sourceExecutions = 0;
        let timeoutCalls = 0;
        const readTimeout: ReadTimeout = {
            execute: async (work, timeoutMs) => {
                timeoutCalls += 1;
                if (timeoutMs === 10) {
                    return { type: 'timed-out' };
                }

                return { type: 'completed', result: await work() };
            },
        };
        const handler = {
            execute: async () => {
                sourceExecutions += 1;
                return source.promise;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readTimeout,
        });

        const short = reader.execute(queryFor('wallet-1', 'wallet:shared', 10));
        const long = reader.execute(queryFor('wallet-1', 'wallet:shared', 1000));

        await expect(short).rejects.toEqual(new ReadTimedOutError(10));
        expect(sourceExecutions).toBe(1);

        source.resolve({ id: 'wallet-1', balance: 40 });

        await expect(long).resolves.toEqual({ id: 'wallet-1', balance: 40 });
        expect(sourceExecutions).toBe(1);
        expect(timeoutCalls).toBe(2);

        await expect(reader.execute(queryFor('wallet-1', 'wallet:shared'))).resolves.toEqual({
            id: 'wallet-1',
            balance: 40,
        });
        expect(sourceExecutions).toBe(2);
    });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type RedisClientType } from 'redis';

import type { Query, ReadCacheKey } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import { RedisReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator-redis';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader } from '../index.js';

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
    const promise = new Promise<TResult>((promiseResolve) => {
        resolve = promiseResolve;
    });

    return { promise, resolve };
}

function queryFor(
    key: ReadCacheKey,
    readCache: () => Promise<WalletView | undefined>,
    writeCache: (value: WalletView) => Promise<void>,
): GetWalletQuery {
    return {
        read: {
            name: 'wallet.get',
            actor: {
                type: 'user',
                id: 'user-1',
                origin: {},
            },
            parameters: { walletId: 'wallet-1' },
        },
        context: { correlationId: 'correlation-1' },
        options: {
            cache: {
                key,
                coordination: { leaseDurationMs: 250 },
                levels: [
                    {
                        scope: 'shared',
                        reader: {
                            read: async () => {
                                const value = await readCache();
                                return value === undefined
                                    ? { status: 'miss' }
                                    : { status: 'hit', value };
                            },
                        },
                        writer: {
                            write: async (_cacheKey, value) => writeCache(value),
                        },
                    },
                ],
            },
        },
    };
}

const redisUrl = process.env.READ_COORDINATOR_REDIS_URL;

if (redisUrl === undefined) {
    throw new Error('READ_COORDINATOR_REDIS_URL is required for Reader distributed integration tests.');
}

describe('DefaultReader distributed shared-cache rendezvous', () => {
    let firstClient: RedisClientType;
    let secondClient: RedisClientType;
    let firstCoordinator: RedisReadExecutionCoordinator;
    let secondCoordinator: RedisReadExecutionCoordinator;

    beforeAll(async () => {
        firstClient = createClient({ url: redisUrl });
        secondClient = createClient({ url: redisUrl });
        await Promise.all([firstClient.connect(), secondClient.connect()]);
        await firstClient.flushDb();

        const keyPrefix = `reader-integration:${Date.now()}`;
        firstCoordinator = new RedisReadExecutionCoordinator(firstClient, { keyPrefix });
        secondCoordinator = new RedisReadExecutionCoordinator(secondClient, { keyPrefix });
        await Promise.all([firstCoordinator.connect(), secondCoordinator.connect()]);
    });

    afterAll(async () => {
        await Promise.all([firstCoordinator.close(), secondCoordinator.close()]);
        if (firstClient.isOpen) {
            await firstClient.quit();
        }
        if (secondClient.isOpen) {
            await secondClient.quit();
        }
    });

    it('collapses a cold multi-instance burst around one source execution and shared-cache recovery', async () => {
        const cacheKey: ReadCacheKey = {
            namespace: 'wallet.get',
            version: '1',
            partition: 'tenant:tenant-1',
            value: 'wallet:wallet-1',
        };
        let sharedValue: WalletView | undefined;
        let sourceExecutions = 0;
        const sourceStarted = deferred<void>();
        const sourceGate = deferred<void>();
        const handler = {
            execute: async () => {
                sourceExecutions += 1;
                sourceStarted.resolve();
                await sourceGate.promise;
                return { id: 'wallet-1', balance: 42 };
            },
        };
        const resolution = { status: 'resolved', handlers: [handler] } as const;
        const readCache = async () => sharedValue;
        const writeCache = async (value: WalletView) => {
            sharedValue = value;
        };
        const query = queryFor(cacheKey, readCache, writeCache);
        const firstReader = new DefaultReader({
            readHandlerResolver: resolverWith(resolution),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'instance-a',
        });
        const secondReader = new DefaultReader({
            readHandlerResolver: resolverWith(resolution),
            readExecutionCoordinator: secondCoordinator,
            readExecutionOwnerIdFactory: () => 'instance-b',
        });

        const first = firstReader.execute(query);
        const second = secondReader.execute(query);

        await sourceStarted.promise;
        expect(sourceExecutions).toBe(1);

        sourceGate.resolve();

        await expect(Promise.all([first, second])).resolves.toEqual([
            { id: 'wallet-1', balance: 42 },
            { id: 'wallet-1', balance: 42 },
        ]);
        expect(sourceExecutions).toBe(1);
        expect(sharedValue).toEqual({ id: 'wallet-1', balance: 42 });
    });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type RedisClientType } from 'redis';

import { InMemoryReadCache } from '@event-driven-platform/read-cache-in-memory';
import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    RedisReadCacheReader,
    RedisReadCacheWriter,
} from '@event-driven-platform/read-cache-redis';
import { RedisReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator-redis';
import type { Query, ReadCacheKey } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader } from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

const redisUrl = process.env.READ_COORDINATOR_REDIS_URL;

if (redisUrl === undefined) {
    throw new Error('READ_COORDINATOR_REDIS_URL is required for Reader verification tests.');
}

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

function cacheKeyFor(walletId: string): ReadCacheKey {
    return {
        namespace: 'wallet.get',
        version: '1',
        partition: 'tenant:verification',
        value: `wallet:${walletId}`,
    };
}

function queryFor(
    walletId: string,
    localCache: InMemoryReadCache<WalletView>,
    redisReader: RedisReadCacheReader<WalletView>,
    redisWriter: RedisReadCacheWriter<WalletView>,
    options: { readonly timeoutMs?: number; readonly signal?: AbortSignal } = {},
): GetWalletQuery {
    return {
        read: {
            name: 'wallet.get',
            actor: {
                type: 'user',
                id: 'verification-user',
                origin: {},
            },
            parameters: { walletId },
        },
        context: { correlationId: `verification:${walletId}` },
        options: {
            ...options,
            cache: {
                key: cacheKeyFor(walletId),
                coordination: { leaseDurationMs: 250 },
                levels: [
                    {
                        scope: 'local',
                        reader: localCache,
                        writer: localCache,
                    },
                    {
                        scope: 'shared',
                        reader: redisReader,
                        writer: redisWriter,
                    },
                ],
            },
        },
    };
}

describe('DefaultReader load and recovery verification', () => {
    let cacheClient: RedisClientType;
    let firstCoordinatorClient: RedisClientType;
    let secondCoordinatorClient: RedisClientType;
    let firstCoordinator: RedisReadExecutionCoordinator;
    let secondCoordinator: RedisReadExecutionCoordinator;
    let redisReader: RedisReadCacheReader<WalletView>;
    let redisWriter: RedisReadCacheWriter<WalletView>;

    beforeAll(async () => {
        cacheClient = createClient({ url: redisUrl });
        firstCoordinatorClient = createClient({ url: redisUrl });
        secondCoordinatorClient = createClient({ url: redisUrl });

        await Promise.all([
            cacheClient.connect(),
            firstCoordinatorClient.connect(),
            secondCoordinatorClient.connect(),
        ]);

        const keyPrefix = `reader-verification:${Date.now()}`;
        firstCoordinator = new RedisReadExecutionCoordinator(firstCoordinatorClient, { keyPrefix });
        secondCoordinator = new RedisReadExecutionCoordinator(secondCoordinatorClient, { keyPrefix });
        await Promise.all([firstCoordinator.connect(), secondCoordinator.connect()]);

        const codec = createJsonReadCacheCodec<WalletView>();
        redisReader = new RedisReadCacheReader({ client: cacheClient, codec });
        redisWriter = new RedisReadCacheWriter({
            client: cacheClient,
            codec,
            ttlPolicy: createRedisReadCacheTtlPolicy({ ttlMs: 5_000 }),
        });
    });

    beforeEach(async () => {
        await cacheClient.flushDb();
    });

    afterAll(async () => {
        await Promise.all([firstCoordinator.close(), secondCoordinator.close()]);
        for (const client of [cacheClient, firstCoordinatorClient, secondCoordinatorClient]) {
            if (client.isOpen) {
                await client.quit();
            }
        }
    });

    it('collapses a 100-request one-instance hot-key burst into one source execution', async () => {
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        const sourceStarted = deferred<void>();
        const sourceGate = deferred<void>();
        let sourceExecutions = 0;
        const handler = {
            execute: async (read: GetWalletRead) => {
                sourceExecutions += 1;
                sourceStarted.resolve();
                await sourceGate.promise;
                return { id: read.parameters.walletId, balance: 42 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'single-instance',
        });
        const query = queryFor('hot-1', localCache, redisReader, redisWriter);

        const requests = Array.from({ length: 100 }, () => reader.execute(query));
        await sourceStarted.promise;
        expect(sourceExecutions).toBe(1);

        sourceGate.resolve();
        const results = await Promise.all(requests);

        expect(results).toHaveLength(100);
        expect(results.every((result) => result.balance === 42)).toBe(true);
        expect(sourceExecutions).toBe(1);
        await expect(localCache.read(cacheKeyFor('hot-1'))).resolves.toEqual({
            status: 'hit',
            value: { id: 'hot-1', balance: 42 },
        });
    });

    it('collapses a 100-request two-instance cold-cache burst and promotes both local L1 caches', async () => {
        const firstLocal = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        const secondLocal = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        const sourceStarted = deferred<void>();
        const sourceGate = deferred<void>();
        let sourceExecutions = 0;
        const handler = {
            execute: async (read: GetWalletRead) => {
                sourceExecutions += 1;
                sourceStarted.resolve();
                await sourceGate.promise;
                return { id: read.parameters.walletId, balance: 84 };
            },
        };
        const resolution = { status: 'resolved', handlers: [handler] } as const;
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
        const firstQuery = queryFor('hot-2', firstLocal, redisReader, redisWriter);
        const secondQuery = queryFor('hot-2', secondLocal, redisReader, redisWriter);

        const requests = [
            ...Array.from({ length: 50 }, () => firstReader.execute(firstQuery)),
            ...Array.from({ length: 50 }, () => secondReader.execute(secondQuery)),
        ];

        await sourceStarted.promise;
        expect(sourceExecutions).toBe(1);

        sourceGate.resolve();
        const results = await Promise.all(requests);

        expect(results).toHaveLength(100);
        expect(sourceExecutions).toBe(1);
        await expect(firstLocal.read(cacheKeyFor('hot-2'))).resolves.toMatchObject({ status: 'hit' });
        await expect(secondLocal.read(cacheKeyFor('hot-2'))).resolves.toMatchObject({ status: 'hit' });
    });

    it('keeps unrelated keys independently concurrent', async () => {
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        const firstStarted = deferred<void>();
        const secondStarted = deferred<void>();
        const gate = deferred<void>();
        let activeSources = 0;
        let maxActiveSources = 0;
        const handler = {
            execute: async (read: GetWalletRead) => {
                activeSources += 1;
                maxActiveSources = Math.max(maxActiveSources, activeSources);
                if (read.parameters.walletId === 'parallel-a') {
                    firstStarted.resolve();
                } else {
                    secondStarted.resolve();
                }
                await gate.promise;
                activeSources -= 1;
                return { id: read.parameters.walletId, balance: 1 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => `parallel-${Math.random()}`,
        });

        const first = reader.execute(queryFor('parallel-a', localCache, redisReader, redisWriter));
        const second = reader.execute(queryFor('parallel-b', localCache, redisReader, redisWriter));

        await Promise.all([firstStarted.promise, secondStarted.promise]);
        expect(maxActiveSources).toBe(2);

        gate.resolve();
        await Promise.all([first, second]);
    });

    it('allows a cancelled follower to stop waiting without cancelling the shared flight', async () => {
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        const sourceStarted = deferred<void>();
        const sourceGate = deferred<void>();
        let sourceExecutions = 0;
        const handler = {
            execute: async (read: GetWalletRead) => {
                sourceExecutions += 1;
                sourceStarted.resolve();
                await sourceGate.promise;
                return { id: read.parameters.walletId, balance: 21 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'cancellation-owner',
        });
        const leader = reader.execute(queryFor('cancelled-follower', localCache, redisReader, redisWriter));
        await sourceStarted.promise;

        const controller = new AbortController();
        const follower = reader.execute(
            queryFor('cancelled-follower', localCache, redisReader, redisWriter, {
                signal: controller.signal,
            }),
        );
        controller.abort();

        await expect(follower).rejects.toThrow('cancelled');
        expect(sourceExecutions).toBe(1);

        sourceGate.resolve();
        await expect(leader).resolves.toEqual({ id: 'cancelled-follower', balance: 21 });
        expect(sourceExecutions).toBe(1);
    });

    it('cleans failed local flight state so a later request can recover', async () => {
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 32, ttlMs: 2_000 });
        let sourceExecutions = 0;
        let fail = true;
        const handler = {
            execute: async (read: GetWalletRead) => {
                sourceExecutions += 1;
                if (fail) {
                    throw new Error('source unavailable');
                }
                return { id: read.parameters.walletId, balance: 7 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'recovery-owner',
        });
        const query = queryFor('recovery', localCache, redisReader, redisWriter);

        const failedBurst = Array.from({ length: 25 }, () => reader.execute(query));
        await expect(Promise.all(failedBurst)).rejects.toThrow('source unavailable');

        fail = false;
        await expect(reader.execute(query)).resolves.toEqual({ id: 'recovery', balance: 7 });
        expect(sourceExecutions).toBeGreaterThanOrEqual(2);
    });

    it('keeps InMemory storage bounded under sustained distinct-key population', async () => {
        const capacity = 64;
        const localCache = new InMemoryReadCache<WalletView>({ capacity, ttlMs: 60_000 });

        for (let index = 0; index < 5_000; index += 1) {
            await localCache.write(cacheKeyFor(`bounded-${index}`), {
                id: `bounded-${index}`,
                balance: index,
            });
        }

        expect(localCache.size).toBe(capacity);
    });
});

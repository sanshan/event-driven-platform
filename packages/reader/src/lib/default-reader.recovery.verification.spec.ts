import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type RedisClientType } from 'redis';

import { InMemoryReadCache } from '@event-driven-platform/read-cache-in-memory';
import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    RedisReadCacheReader,
    RedisReadCacheWriter,
} from '@event-driven-platform/read-cache-redis';
import type {
    ReadExecutionCoordinator,
    ReadExecutionLeaseReference,
} from '@event-driven-platform/read-execution-coordinator';
import { RedisReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator-redis';
import type { Query, ReadCacheKey } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import {
    DefaultReader,
    ReadExecutionCoordinatorUnavailableError,
    ReadExecutionOwnershipLostError,
} from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

const redisUrl = process.env.READ_COORDINATOR_REDIS_URL;

if (redisUrl === undefined) {
    throw new Error('READ_COORDINATOR_REDIS_URL is required for Reader recovery verification tests.');
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
    const promise = new Promise<TResult>((promiseResolve) => {
        resolve = promiseResolve;
    });

    return { promise, resolve };
}

function keyFor(walletId: string): ReadCacheKey {
    return {
        namespace: 'wallet.get',
        version: '1',
        partition: 'tenant:verification-recovery',
        value: `wallet:${walletId}`,
    };
}

function queryFor(
    walletId: string,
    localCache: InMemoryReadCache<WalletView>,
    sharedReader: RedisReadCacheReader<WalletView>,
    sharedWriter: RedisReadCacheWriter<WalletView>,
    leaseDurationMs = 120,
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
        context: { correlationId: `verification-recovery:${walletId}` },
        options: {
            cache: {
                key: keyFor(walletId),
                coordination: { leaseDurationMs },
                levels: [
                    {
                        scope: 'local',
                        reader: localCache,
                        writer: localCache,
                    },
                    {
                        scope: 'shared',
                        reader: sharedReader,
                        writer: sharedWriter,
                    },
                ],
            },
        },
    };
}

describe('DefaultReader distributed recovery verification', () => {
    let cacheClient: RedisClientType;
    let firstCoordinatorClient: RedisClientType;
    let secondCoordinatorClient: RedisClientType;
    let firstCoordinator: RedisReadExecutionCoordinator;
    let secondCoordinator: RedisReadExecutionCoordinator;
    let sharedReader: RedisReadCacheReader<WalletView>;
    let sharedWriter: RedisReadCacheWriter<WalletView>;
    let coordinatorKeyPrefix: string;

    beforeAll(async () => {
        cacheClient = createClient({ url: redisUrl });
        firstCoordinatorClient = createClient({ url: redisUrl });
        secondCoordinatorClient = createClient({ url: redisUrl });
        await Promise.all([
            cacheClient.connect(),
            firstCoordinatorClient.connect(),
            secondCoordinatorClient.connect(),
        ]);

        coordinatorKeyPrefix = `reader-recovery-verification:${process.pid}:${Date.now()}`;
        firstCoordinator = new RedisReadExecutionCoordinator(firstCoordinatorClient, {
            keyPrefix: coordinatorKeyPrefix,
        });
        secondCoordinator = new RedisReadExecutionCoordinator(secondCoordinatorClient, {
            keyPrefix: coordinatorKeyPrefix,
        });
        await Promise.all([firstCoordinator.connect(), secondCoordinator.connect()]);

        const codec = createJsonReadCacheCodec<WalletView>();
        sharedReader = new RedisReadCacheReader({ client: cacheClient, codec });
        sharedWriter = new RedisReadCacheWriter({
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

    it('allows a waiting instance to re-contend and recover after leader source failure', async () => {
        const firstLocal = new InMemoryReadCache<WalletView>({ capacity: 16, ttlMs: 1_000 });
        const secondLocal = new InMemoryReadCache<WalletView>({ capacity: 16, ttlMs: 1_000 });
        const firstSourceStarted = deferred<void>();
        const firstSourceGate = deferred<void>();
        let sourceExecutions = 0;
        const handler = {
            execute: async (read: GetWalletRead) => {
                sourceExecutions += 1;
                if (sourceExecutions === 1) {
                    firstSourceStarted.resolve();
                    await firstSourceGate.promise;
                    throw new Error('leader source failed');
                }

                return { id: read.parameters.walletId, balance: 91 };
            },
        };
        const resolution = { status: 'resolved', handlers: [handler] } as const;
        const firstReader = new DefaultReader({
            readHandlerResolver: resolverWith(resolution),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'failed-leader',
        });
        const secondReader = new DefaultReader({
            readHandlerResolver: resolverWith(resolution),
            readExecutionCoordinator: secondCoordinator,
            readExecutionOwnerIdFactory: () => 'recovering-follower',
        });

        const first = firstReader.execute(queryFor('leader-failure', firstLocal, sharedReader, sharedWriter));
        await firstSourceStarted.promise;
        const follower = secondReader.execute(
            queryFor('leader-failure', secondLocal, sharedReader, sharedWriter),
        );

        firstSourceGate.resolve();

        await expect(first).rejects.toThrow('leader source failed');
        await expect(follower).resolves.toEqual({ id: 'leader-failure', balance: 91 });
        expect(sourceExecutions).toBe(2);
        await expect(secondLocal.read(keyFor('leader-failure'))).resolves.toMatchObject({
            status: 'hit',
        });
    });

    it('fails closed when coordination is unavailable and does not execute the source', async () => {
        const unavailableCoordinator: ReadExecutionCoordinator = {
            claim: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
            wait: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
            renew: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
            release: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
        };
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 8, ttlMs: 1_000 });
        let sourceExecutions = 0;
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [
                    {
                        execute: async () => {
                            sourceExecutions += 1;
                            return { id: 'coordinator-down', balance: 1 };
                        },
                    },
                ],
            }),
            readExecutionCoordinator: unavailableCoordinator,
        });

        await expect(
            reader.execute(queryFor('coordinator-down', localCache, sharedReader, sharedWriter)),
        ).rejects.toEqual(new ReadExecutionCoordinatorUnavailableError('coordinator unavailable'));
        expect(sourceExecutions).toBe(0);
    });

    it('rejects an owner that loses its lease before publishing a slow source result', async () => {
        const lease: ReadExecutionLeaseReference = { ownerId: 'stale-owner', version: 1 };
        const renewalAttempted = deferred<void>();
        const ownershipLostCoordinator: ReadExecutionCoordinator = {
            claim: async () => ({ status: 'acquired', lease }),
            wait: async () => ({ status: 'timed-out' }),
            renew: async () => {
                renewalAttempted.resolve();
                return { status: 'ownership-lost' };
            },
            release: async () => ({ status: 'ownership-lost' }),
        };
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 8, ttlMs: 1_000 });
        const sourceStarted = deferred<void>();
        const sourceGate = deferred<void>();
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [
                    {
                        execute: async () => {
                            sourceStarted.resolve();
                            await sourceGate.promise;
                            return { id: 'ownership-loss', balance: 12 };
                        },
                    },
                ],
            }),
            readExecutionCoordinator: ownershipLostCoordinator,
            readExecutionOwnerIdFactory: () => 'stale-owner',
        });

        const execution = reader.execute(
            queryFor('ownership-loss', localCache, sharedReader, sharedWriter, 20),
        );
        await sourceStarted.promise;
        await renewalAttempted.promise;
        sourceGate.resolve();

        await expect(execution).rejects.toEqual(new ReadExecutionOwnershipLostError());
        await expect(localCache.read(keyFor('ownership-loss'))).resolves.toEqual({ status: 'miss' });
    });

    it('removes per-key Redis lease state after completed distinct-key flights', async () => {
        const localCache = new InMemoryReadCache<WalletView>({ capacity: 8, ttlMs: 1_000 });
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [
                    {
                        execute: async (read: GetWalletRead) => ({
                            id: read.parameters.walletId,
                            balance: 1,
                        }),
                    },
                ],
            }),
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'lifecycle-owner',
        });

        for (let index = 0; index < 50; index += 1) {
            await reader.execute(
                queryFor(`lifecycle-${index}`, localCache, sharedReader, sharedWriter, 100),
            );
        }

        const leaseKeys = await cacheClient.keys(`${coordinatorKeyPrefix}:lease:*`);
        expect(leaseKeys).toEqual([]);
        await expect(cacheClient.exists(`${coordinatorKeyPrefix}:generation`)).resolves.toBe(1);
    });
});

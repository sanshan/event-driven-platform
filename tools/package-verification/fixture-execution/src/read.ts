import { DefaultActorFactory } from '@event-driven-platform/actor';
import type { Query } from '@event-driven-platform/query';
import type { AnyRead, Read } from '@event-driven-platform/read';
import { InMemoryReadCache } from '@event-driven-platform/read-cache-in-memory';
import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    RedisReadCacheReader,
    RedisReadCacheWriter,
} from '@event-driven-platform/read-cache-redis';
import { RedisReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator-redis';
import type { ReadHandler } from '@event-driven-platform/read-handler';
import type {
    ReadHandlerResolution,
    ReadHandlerResolver,
} from '@event-driven-platform/read-handler-resolver';
import { DefaultReader } from '@event-driven-platform/reader';
import { createClient } from 'redis';

interface UserView {
    readonly id: string;
    readonly name: string;
}

type GetUserRead = Read<'user.get', { readonly userId: string }, UserView>;
type GetUserQuery = Query<GetUserRead>;

const actor = new DefaultActorFactory().create({
    type: 'service',
    id: 'read-release-verification',
});

function resolverFor(handler: ReadHandler<GetUserRead>): ReadHandlerResolver {
    return {
        resolve<TRead extends AnyRead>(_read: TRead): ReadHandlerResolution<TRead> {
            return {
                status: 'resolved',
                handlers: [handler as unknown as ReadHandler<TRead>],
            };
        },
    };
}

function queryFor(
    userId: string,
    options?: GetUserQuery['options'],
): GetUserQuery {
    return {
        read: {
            name: 'user.get',
            actor,
            parameters: { userId },
        },
        context: {
            correlationId: `read-release-verification:${userId}`,
        },
        options,
    };
}

async function verifyNoCache(): Promise<void> {
    let sourceExecutions = 0;
    const reader = new DefaultReader({
        readHandlerResolver: resolverFor({
            async execute(read) {
                sourceExecutions += 1;
                return { id: read.parameters.userId, name: 'No Cache' };
            },
        }),
    });

    const result = await reader.execute(queryFor('user-no-cache'));

    if (
        result.id !== 'user-no-cache' ||
        result.name !== 'No Cache' ||
        sourceExecutions !== 1
    ) {
        throw new Error('Published Read no-cache verification failed.');
    }
}

async function verifyInMemoryCache(): Promise<void> {
    let sourceExecutions = 0;
    const cache = new InMemoryReadCache<UserView>({
        capacity: 16,
        ttlMs: 30_000,
    });
    const reader = new DefaultReader({
        readHandlerResolver: resolverFor({
            async execute(read) {
                sourceExecutions += 1;
                return { id: read.parameters.userId, name: 'L1 Cache' };
            },
        }),
    });
    const query = queryFor('user-l1', {
        cache: {
            key: {
                namespace: 'user.get',
                version: '1',
                partition: 'verification',
                value: 'user:user-l1',
            },
            levels: [
                {
                    scope: 'local',
                    reader: cache,
                    writer: cache,
                },
            ],
        },
    });

    const first = await reader.execute(query);
    const second = await reader.execute(query);

    if (
        first.id !== 'user-l1' ||
        second.id !== 'user-l1' ||
        sourceExecutions !== 1
    ) {
        throw new Error('Published Read InMemory cache verification failed.');
    }
}

async function verifyRedisDistributed(redisUrl: string): Promise<void> {
    const cacheClient = createClient({ url: redisUrl });
    const firstCoordinatorClient = createClient({ url: redisUrl });
    const secondCoordinatorClient = createClient({ url: redisUrl });

    await Promise.all([
        cacheClient.connect(),
        firstCoordinatorClient.connect(),
        secondCoordinatorClient.connect(),
    ]);

    const firstCoordinator = new RedisReadExecutionCoordinator(firstCoordinatorClient, {
        keyPrefix: 'package-verification:read-execution',
    });
    const secondCoordinator = new RedisReadExecutionCoordinator(secondCoordinatorClient, {
        keyPrefix: 'package-verification:read-execution',
    });

    try {
        await cacheClient.flushDb();
        await Promise.all([firstCoordinator.connect(), secondCoordinator.connect()]);

        const codec = createJsonReadCacheCodec<UserView>();
        const sharedReader = new RedisReadCacheReader<UserView>({
            client: cacheClient,
            codec,
        });
        const sharedWriter = new RedisReadCacheWriter<UserView>({
            client: cacheClient,
            codec,
            ttlPolicy: createRedisReadCacheTtlPolicy({ ttlMs: 30_000 }),
        });
        const firstL1 = new InMemoryReadCache<UserView>({ capacity: 16, ttlMs: 30_000 });
        const secondL1 = new InMemoryReadCache<UserView>({ capacity: 16, ttlMs: 30_000 });

        let sourceExecutions = 0;
        const handler: ReadHandler<GetUserRead> = {
            async execute(read) {
                sourceExecutions += 1;
                await new Promise((resolve) => setTimeout(resolve, 25));
                return { id: read.parameters.userId, name: 'Distributed Cache' };
            },
        };
        const resolver = resolverFor(handler);
        const firstReader = new DefaultReader({
            readHandlerResolver: resolver,
            readExecutionCoordinator: firstCoordinator,
            readExecutionOwnerIdFactory: () => 'external-consumer-a',
        });
        const secondReader = new DefaultReader({
            readHandlerResolver: resolver,
            readExecutionCoordinator: secondCoordinator,
            readExecutionOwnerIdFactory: () => 'external-consumer-b',
        });

        const cacheKey = {
            namespace: 'user.get',
            version: '1',
            partition: 'verification',
            value: 'user:user-distributed',
        } as const;
        const firstQuery = queryFor('user-distributed', {
            cache: {
                key: cacheKey,
                coordination: { leaseDurationMs: 1_000 },
                levels: [
                    { scope: 'local', reader: firstL1, writer: firstL1 },
                    { scope: 'shared', reader: sharedReader, writer: sharedWriter },
                ],
            },
        });
        const secondQuery = queryFor('user-distributed', {
            cache: {
                key: cacheKey,
                coordination: { leaseDurationMs: 1_000 },
                levels: [
                    { scope: 'local', reader: secondL1, writer: secondL1 },
                    { scope: 'shared', reader: sharedReader, writer: sharedWriter },
                ],
            },
        });

        const [first, second] = await Promise.all([
            firstReader.execute(firstQuery),
            secondReader.execute(secondQuery),
        ]);

        if (
            first.id !== 'user-distributed' ||
            second.id !== 'user-distributed' ||
            sourceExecutions !== 1
        ) {
            throw new Error('Published Read distributed verification failed.');
        }

        const [firstLocalHit, secondLocalHit] = await Promise.all([
            firstL1.read(cacheKey),
            secondL1.read(cacheKey),
        ]);
        if (firstLocalHit.status !== 'hit' || secondLocalHit.status !== 'hit') {
            throw new Error('Published Read distributed L1 promotion verification failed.');
        }
    } finally {
        await Promise.all([firstCoordinator.close(), secondCoordinator.close()]);
        await Promise.all(
            [cacheClient, firstCoordinatorClient, secondCoordinatorClient].map(async (client) => {
                if (client.isOpen) {
                    await client.quit();
                }
            }),
        );
    }
}

await verifyNoCache();
await verifyInMemoryCache();

const redisUrl = process.env.READ_PACKAGE_VERIFICATION_REDIS_URL;
if (redisUrl !== undefined) {
    await verifyRedisDistributed(redisUrl);
}

import type { TenantScopedReadCacheKey } from '@event-driven-platform/query';
import { createClient } from 'redis';

import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    RedisReadCacheReader,
    RedisReadCacheWriter,
} from './read-cache-redis.js';

const redisUrl = process.env.READ_CACHE_REDIS_URL;

if (redisUrl === undefined) {
    throw new Error('READ_CACHE_REDIS_URL is required for Redis cache integration tests.');
}

const key: TenantScopedReadCacheKey = {
    tenant: {
        type: 'merchant',
        id: 'tenant-a' as TenantScopedReadCacheKey['tenant']['id'],
    },
    key: {
        namespace: 'integration',
        version: 'v1',
        partition: 'users',
        value: 'user-1',
    },
};

describe('Redis read cache integration', () => {
    const client = createClient({ url: redisUrl, disableOfflineQueue: true });

    beforeAll(async () => {
        await client.connect();
    });

    afterAll(async () => {
        if (client.isOpen) {
            await client.quit();
        }
    });

    beforeEach(async () => {
        await client.flushDb();
    });

    it('distinguishes miss from hit and stores serialized values with TTL', async () => {
        const codec = createJsonReadCacheCodec<{ readonly id: number }>();
        const reader = new RedisReadCacheReader({ client, codec });
        const writer = new RedisReadCacheWriter({
            client,
            codec,
            ttlPolicy: createRedisReadCacheTtlPolicy({ ttlMs: 5_000 }),
        });

        await expect(reader.read(key)).resolves.toEqual({ status: 'miss' });

        await writer.write(key, { id: 1 });

        await expect(reader.read(key)).resolves.toEqual({ status: 'hit', value: { id: 1 } });

        const keys = await client.keys('read-cache:*');
        expect(keys).toHaveLength(1);

        const [storedKey] = keys;
        if (storedKey === undefined) {
            throw new Error('Expected one Redis cache key after write.');
        }

        await expect(client.pTTL(storedKey)).resolves.toBeGreaterThan(0);
    });

    it('returns an error outcome when deserialization fails', async () => {
        const writer = new RedisReadCacheWriter({
            client,
            codec: createJsonReadCacheCodec<{ readonly id: number }>(),
            ttlPolicy: createRedisReadCacheTtlPolicy({ ttlMs: 5_000 }),
        });
        const reader = new RedisReadCacheReader<{ readonly id: number }>({
            client,
            codec: {
                serialize: JSON.stringify,
                deserialize: () => {
                    throw new Error('decode failed');
                },
            },
        });

        await writer.write(key, { id: 1 });

        const result = await reader.read(key);
        expect(result.status).toBe('error');
    });

    it('surfaces writer failures without hidden retry', async () => {
        const disconnected = createClient({ url: redisUrl, disableOfflineQueue: true });
        const writer = new RedisReadCacheWriter({
            client: disconnected,
            codec: createJsonReadCacheCodec<string>(),
            ttlPolicy: createRedisReadCacheTtlPolicy({ ttlMs: 5_000 }),
        });

        await expect(writer.write(key, 'value')).rejects.toBeDefined();
    });
});

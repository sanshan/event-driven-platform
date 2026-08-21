import type { ReadCacheKey } from '@event-driven-platform/query';
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

const key: ReadCacheKey = {
    namespace: 'integration',
    version: 'v1',
    partition: 'tenant-a',
    value: 'user-1',
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
        await expect(client.pTTL(keys[0]!)).resolves.toBeGreaterThan(0);
    });

    it('returns an error outcome when deserialization fails', async () => {
        const reader = new RedisReadCacheReader<{ readonly id: number }>({
            client,
            codec: {
                serialize: JSON.stringify,
                deserialize: () => {
                    throw new Error('decode failed');
                },
            },
        });

        await client.set('read-cache:integration:v1:tenant-a:user-1', '{"id":1}', { PX: 5_000 });

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

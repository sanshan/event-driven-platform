import type { TenantScopedReadCacheKey } from '@event-driven-platform/query';
import type { RedisClientType } from 'redis';

import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    defaultRedisReadCacheKeyEncoder,
    RedisReadCacheWriter,
} from './read-cache-redis.js';

const key: TenantScopedReadCacheKey = {
    tenant: {
        type: 'merchant',
        id: 'tenant-a' as TenantScopedReadCacheKey['tenant']['id'],
    },
    key: {
        namespace: 'user',
        version: 'v1',
        partition: 'users',
        value: '1',
    },
};

describe('Redis read cache policies', () => {
    it('encodes logical read identity deterministically and collision-safely', () => {
        expect(defaultRedisReadCacheKeyEncoder.encode(key.key)).toBe('read-cache:user:v1:users:1');
        expect(
            defaultRedisReadCacheKeyEncoder.encode({
                namespace: 'user:a',
                version: 'v1',
                partition: 'users/all',
                value: '1 2',
            }),
        ).toBe('read-cache:user%3Aa:v1:users%2Fall:1%202');
    });

    it('keeps tenant scope outside a custom logical key encoder', async () => {
        const setKeys: string[] = [];
        const client = {
            set: async (redisKey: string) => {
                setKeys.push(redisKey);
                return 'OK';
            },
        } as unknown as RedisClientType;
        const writer = new RedisReadCacheWriter<{ readonly id: string }>({
            client,
            codec: createJsonReadCacheCodec(),
            ttlPolicy: { resolveTtlMs: () => 1_000 },
            keyEncoder: { encode: () => 'constant' },
        });
        const otherTenantKey: TenantScopedReadCacheKey = {
            tenant: {
                type: 'merchant',
                id: 'tenant-b' as TenantScopedReadCacheKey['tenant']['id'],
            },
            key: key.key,
        };

        await writer.write(key, { id: '1' });
        await writer.write(otherTenantKey, { id: '1' });

        expect(setKeys).toEqual([
            'read-cache:merchant:tenant-a:constant',
            'read-cache:merchant:tenant-b:constant',
        ]);
    });

    it('serializes and deserializes JSON values explicitly', () => {
        const codec = createJsonReadCacheCodec<{ readonly id: number }>();
        const serialized = codec.serialize({ id: 1 });

        expect(serialized).toBe('{"id":1}');
        expect(codec.deserialize(serialized)).toEqual({ id: 1 });
    });

    it('resolves deterministic TTL jitter with an injected random source', () => {
        const low = createRedisReadCacheTtlPolicy({ ttlMs: 1_000, jitterRatio: 0.1, random: () => 0 });
        const middle = createRedisReadCacheTtlPolicy({ ttlMs: 1_000, jitterRatio: 0.1, random: () => 0.5 });
        const high = createRedisReadCacheTtlPolicy({ ttlMs: 1_000, jitterRatio: 0.1, random: () => 0.999 });

        expect(low.resolveTtlMs()).toBe(900);
        expect(middle.resolveTtlMs()).toBe(1_000);
        expect(high.resolveTtlMs()).toBeGreaterThanOrEqual(1_099);
        expect(high.resolveTtlMs()).toBeLessThanOrEqual(1_100);
    });

    it('rejects invalid TTL policy configuration and random sources', () => {
        expect(() => createRedisReadCacheTtlPolicy({ ttlMs: 0 })).toThrow(RangeError);
        expect(() => createRedisReadCacheTtlPolicy({ ttlMs: 1_000, jitterRatio: 1 })).toThrow(RangeError);

        const policy = createRedisReadCacheTtlPolicy({ ttlMs: 1_000, random: () => 1 });
        expect(() => policy.resolveTtlMs()).toThrow(RangeError);
    });
});

import type { ReadCacheKey } from '@event-driven-platform/query';

import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    defaultRedisReadCacheKeyEncoder,
} from './read-cache-redis.js';

const key: ReadCacheKey = {
    namespace: 'user',
    version: 'v1',
    partition: 'tenant-a',
    value: '1',
};

describe('Redis read cache policies', () => {
    it('encodes read identity deterministically and collision-safely', () => {
        expect(defaultRedisReadCacheKeyEncoder.encode(key)).toBe('read-cache:user:v1:tenant-a:1');
        expect(
            defaultRedisReadCacheKeyEncoder.encode({
                namespace: 'user:a',
                version: 'v1',
                partition: 'tenant/a',
                value: '1 2',
            }),
        ).toBe('read-cache:user%3Aa:v1:tenant%2Fa:1%202');
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

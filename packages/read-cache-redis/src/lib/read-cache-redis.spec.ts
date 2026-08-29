import type { TenantScopedReadCacheKey } from '@event-driven-platform/query';
import type { AnyRead } from '@event-driven-platform/read';

import {
    createJsonReadCacheCodec,
    createRedisReadCacheTtlPolicy,
    defaultRedisReadCacheKeyEncoder,
} from './read-cache-redis.js';

const key: TenantScopedReadCacheKey = {
    tenant: {
        type: 'merchant',
        id: 'tenant-a' as AnyRead['tenant']['id'],
    },
    key: {
        namespace: 'user',
        version: 'v1',
        partition: 'users',
        value: '1',
    },
};

describe('Redis read cache policies', () => {
    it('encodes tenant and logical read identity deterministically and collision-safely', () => {
        expect(defaultRedisReadCacheKeyEncoder.encode(key)).toBe(
            'read-cache:merchant:tenant-a:user:v1:users:1',
        );
        expect(
            defaultRedisReadCacheKeyEncoder.encode({
                tenant: {
                    type: 'merchant:type',
                    id: 'tenant/a' as AnyRead['tenant']['id'],
                },
                key: {
                    namespace: 'user:a',
                    version: 'v1',
                    partition: 'users/all',
                    value: '1 2',
                },
            }),
        ).toBe('read-cache:merchant%3Atype:tenant%2Fa:user%3Aa:v1:users%2Fall:1%202');
    });

    it('produces different identities for the same logical key across tenants', () => {
        const otherTenantKey: TenantScopedReadCacheKey = {
            tenant: {
                type: 'merchant',
                id: 'tenant-b' as AnyRead['tenant']['id'],
            },
            key: key.key,
        };

        expect(defaultRedisReadCacheKeyEncoder.encode(otherTenantKey)).not.toBe(
            defaultRedisReadCacheKeyEncoder.encode(key),
        );
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

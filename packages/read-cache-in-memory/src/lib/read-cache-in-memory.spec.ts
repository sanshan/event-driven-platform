import type { ReadCacheKey } from '@event-driven-platform/query';

import { InMemoryReadCache } from './read-cache-in-memory.js';

const firstKey: ReadCacheKey = {
    namespace: 'user',
    version: 'v1',
    partition: 'tenant-a',
    value: '1',
};

const secondKey: ReadCacheKey = {
    namespace: 'user',
    version: 'v1',
    partition: 'tenant-a',
    value: '2',
};

describe('InMemoryReadCache', () => {
    it('returns miss, then hit after write', async () => {
        const cache = new InMemoryReadCache<string>({ capacity: 2, ttlMs: 1_000 });

        await expect(cache.read(firstKey)).resolves.toEqual({ status: 'miss' });

        await cache.write(firstKey, 'value-1');

        await expect(cache.read(firstKey)).resolves.toEqual({ status: 'hit', value: 'value-1' });
    });

    it('expires entries deterministically without timers', async () => {
        let now = 1_000;
        const cache = new InMemoryReadCache<string>({
            capacity: 2,
            ttlMs: 100,
            now: () => now,
        });

        await cache.write(firstKey, 'value-1');
        now = 1_100;

        await expect(cache.read(firstKey)).resolves.toEqual({ status: 'miss' });
        expect(cache.size).toBe(0);
    });

    it('evicts the oldest entry when capacity is exceeded', async () => {
        const cache = new InMemoryReadCache<string>({ capacity: 1, ttlMs: 1_000 });

        await cache.write(firstKey, 'value-1');
        await cache.write(secondKey, 'value-2');

        await expect(cache.read(firstKey)).resolves.toEqual({ status: 'miss' });
        await expect(cache.read(secondKey)).resolves.toEqual({ status: 'hit', value: 'value-2' });
        expect(cache.size).toBe(1);
    });

    it('rejects invalid capacity and ttl configuration', () => {
        expect(() => new InMemoryReadCache({ capacity: 0, ttlMs: 1_000 })).toThrow(RangeError);
        expect(() => new InMemoryReadCache({ capacity: 1, ttlMs: 0 })).toThrow(RangeError);
    });
});

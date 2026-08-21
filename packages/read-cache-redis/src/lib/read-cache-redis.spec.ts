import { readCacheRedis } from './read-cache-redis.js';

describe('readCacheRedis', () => {
    it('should work', () => {
        expect(readCacheRedis()).toEqual('read-cache-redis');
    });
});

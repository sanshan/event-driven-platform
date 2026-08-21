import { readCacheInMemory } from './read-cache-in-memory.js';

describe('readCacheInMemory', () => {
    it('should work', () => {
        expect(readCacheInMemory()).toEqual('read-cache-in-memory');
    });
});

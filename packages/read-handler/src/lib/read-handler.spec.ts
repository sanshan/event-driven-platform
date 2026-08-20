import { readHandler } from './read-handler.js';

describe('readHandler', () => {
    it('should work', () => {
        expect(readHandler()).toEqual('read-handler');
    });
});

import { readExecutionCoordinatorRedis } from './read-execution-coordinator-redis.js';

describe('readExecutionCoordinatorRedis', () => {
    it('should work', () => {
        expect(readExecutionCoordinatorRedis()).toEqual('read-execution-coordinator-redis');
    });
});

import { readExecutionCoordinator } from './read-execution-coordinator.js';

describe('readExecutionCoordinator', () => {
    it('should work', () => {
        expect(readExecutionCoordinator()).toEqual('read-execution-coordinator');
    });
});

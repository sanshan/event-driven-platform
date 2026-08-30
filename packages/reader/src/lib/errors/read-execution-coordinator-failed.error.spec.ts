import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ReadExecutionCoordinatorFailedError } from './read-execution-coordinator-failed.error.js';

describe('ReadExecutionCoordinatorFailedError', () => {
    it('is an ExecutionFailureError', () => {
        expect(new ReadExecutionCoordinatorFailedError('unavailable', 'redis unavailable')).toBeInstanceOf(
            ExecutionFailureError,
        );
    });

    it('describes a retryable failure when the coordinator is unavailable', () => {
        const error = new ReadExecutionCoordinatorFailedError('unavailable', 'redis unavailable');

        expect(error.outcome).toBe('unavailable');
        expect(error.reason).toBe('redis unavailable');
        expect(error.executionFailure).toEqual({
            code: 'read-execution-coordinator-unavailable',
            message: 'Read execution coordinator is unavailable: redis unavailable',
            retryable: true,
        });
    });

    it('describes a retryable failure when ownership is lost', () => {
        const error = new ReadExecutionCoordinatorFailedError('ownership-lost');

        expect(error.outcome).toBe('ownership-lost');
        expect(error.executionFailure).toEqual({
            code: 'read-execution-coordinator-ownership-lost',
            message: 'Distributed read execution ownership was lost before the result could be published.',
            retryable: true,
        });
    });
});

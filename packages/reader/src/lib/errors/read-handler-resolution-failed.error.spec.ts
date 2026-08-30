import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ReadHandlerResolutionFailedError } from './read-handler-resolution-failed.error.js';

describe('ReadHandlerResolutionFailedError', () => {
    it('is an ExecutionFailureError', () => {
        expect(new ReadHandlerResolutionFailedError('not-found')).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a non-retryable failure when no ReadHandler is found', () => {
        const error = new ReadHandlerResolutionFailedError('not-found');

        expect(error.status).toBe('not-found');
        expect(error.executionFailure).toEqual({
            code: 'read-handler-not-found',
            message: 'No ReadHandler is available for the requested Read.',
            retryable: false,
        });
    });

    it('describes a non-retryable failure when resolution is ambiguous', () => {
        const error = new ReadHandlerResolutionFailedError('ambiguous', 'multiple incompatible handler sets');

        expect(error.status).toBe('ambiguous');
        expect(error.detail).toBe('multiple incompatible handler sets');
        expect(error.executionFailure).toEqual({
            code: 'read-handler-ambiguous',
            message: 'ReadHandler resolution is ambiguous: multiple incompatible handler sets',
            retryable: false,
        });
    });
});

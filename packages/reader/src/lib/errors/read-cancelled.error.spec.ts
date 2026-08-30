import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ReadCancelledError } from './read-cancelled.error.js';

describe('ReadCancelledError', () => {
    it('is an ExecutionFailureError', () => {
        expect(new ReadCancelledError()).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a non-retryable cancellation', () => {
        const error = new ReadCancelledError();

        expect(error.executionFailure).toEqual({
            code: 'read-cancelled',
            message: 'Read execution was cancelled.',
            retryable: false,
        });
    });
});

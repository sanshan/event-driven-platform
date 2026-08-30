import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ReadTimedOutError } from './read-timed-out.error.js';

describe('ReadTimedOutError', () => {
    it('is an ExecutionFailureError', () => {
        expect(new ReadTimedOutError(25)).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a retryable timeout', () => {
        const error = new ReadTimedOutError(25);

        expect(error.timeoutMs).toBe(25);
        expect(error.executionFailure).toEqual({
            code: 'read-timed-out',
            message: 'Read execution timed out after 25ms.',
            retryable: true,
        });
    });
});

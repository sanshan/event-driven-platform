import { describe, expect, it } from 'vitest';

import { ExecutionFailureError } from './execution-failure-error.js';

describe('ExecutionFailureError', () => {
    it('carries the given ExecutionFailure', () => {
        const error = new ExecutionFailureError({
            code: 'guard-rejected',
            message: 'Guard rejected execution.',
            retryable: false,
        });

        expect(error.executionFailure).toEqual({
            code: 'guard-rejected',
            message: 'Guard rejected execution.',
            retryable: false,
        });
    });

    it('uses the failure message as the Error message', () => {
        const error = new ExecutionFailureError({
            code: 'execution-timed-out',
            message: 'Execution attempt timed out after 5000 ms.',
            retryable: true,
        });

        expect(error.message).toBe('Execution attempt timed out after 5000 ms.');
    });

    it('sets name to the concrete subclass name', () => {
        class ExampleFailureError extends ExecutionFailureError {}

        const error = new ExampleFailureError({
            code: 'example-failure',
            message: 'Example failure.',
            retryable: false,
        });

        expect(error.name).toBe('ExampleFailureError');
    });

    it('forwards the original error as cause', () => {
        const originalError = new Error('connection reset');

        const error = new ExecutionFailureError(
            {
                code: 'persistence-transient-error',
                message: 'Transient persistence failure.',
                retryable: true,
            },
            { cause: originalError },
        );

        expect(error.cause).toBe(originalError);
    });

    it('is an instance of Error', () => {
        const error = new ExecutionFailureError({
            code: 'unexpected-execution-error',
            message: 'An unknown execution error occurred.',
            retryable: false,
        });

        expect(error).toBeInstanceOf(Error);
    });
});

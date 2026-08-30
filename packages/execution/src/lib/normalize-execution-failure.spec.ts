import { describe, expect, it } from 'vitest';

import { ExecutionFailureError } from './execution-failure-error.js';
import { normalizeExecutionFailure } from './normalize-execution-failure.js';

describe('normalizeExecutionFailure', () => {
    it('returns the executionFailure carried by an ExecutionFailureError', () => {
        const error = new ExecutionFailureError({
            code: 'guard-rejected',
            message: 'Guard rejected execution.',
            retryable: false,
        });

        expect(normalizeExecutionFailure(error)).toEqual({
            code: 'guard-rejected',
            message: 'Guard rejected execution.',
            retryable: false,
        });
    });

    it('returns the executionFailure carried by an ExecutionFailureError subclass', () => {
        class ExampleFailureError extends ExecutionFailureError {}

        const error = new ExampleFailureError({
            code: 'example-failure',
            message: 'Example failure.',
            retryable: true,
        });

        expect(normalizeExecutionFailure(error)).toEqual({
            code: 'example-failure',
            message: 'Example failure.',
            retryable: true,
        });
    });

    it('normalizes a plain Error to a non-retryable unexpected-execution-error', () => {
        const error = new Error('connection reset');

        expect(normalizeExecutionFailure(error)).toEqual({
            code: 'unexpected-execution-error',
            message: 'connection reset',
            retryable: false,
        });
    });

    it('normalizes a thrown non-Error value to a generic non-retryable failure', () => {
        expect(normalizeExecutionFailure('boom')).toEqual({
            code: 'unexpected-execution-error',
            message: 'An unknown execution error occurred.',
            retryable: false,
        });
    });
});

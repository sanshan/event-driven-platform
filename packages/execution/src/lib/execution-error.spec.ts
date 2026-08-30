import { describe, expect, it } from 'vitest';

import { ExecutionError } from './execution-error.js';
import type { ExecutionFailure } from './execution-failure.js';
import { normalizeExecutionError } from './normalize-execution-error.js';

const failure: ExecutionFailure = {
    code: 'coordinator-unavailable',
    message: 'The execution coordinator is unavailable.',
    classification: 'unavailable',
    retry: 'caller',
    retryable: false,
};

describe('ExecutionError', () => {
    it('carries the serializable failure while keeping cause out of the descriptor', () => {
        const cause = new Error('Redis connection failed.');
        const error = new ExecutionError(failure, { cause });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ExecutionError');
        expect(error.message).toBe(failure.message);
        expect(error.executionFailure).toBe(failure);
        expect(error.cause).toBe(cause);
        expect(error.executionFailure).not.toHaveProperty('cause');
        expect(error.executionFailure).not.toHaveProperty('stack');
    });

    it('keeps a subclass name for boundary-specific canonical Errors', () => {
        class CoordinatorUnavailableError extends ExecutionError {}

        const error = new CoordinatorUnavailableError(failure);

        expect(error.name).toBe('CoordinatorUnavailableError');
        expect(error).toBeInstanceOf(ExecutionError);
    });
});

describe('normalizeExecutionError', () => {
    it('preserves an existing canonical Error without re-wrapping it', () => {
        const error = new ExecutionError(failure);

        expect(normalizeExecutionError(error)).toBe(error);
    });

    it('preserves a transitional typed Error as the cause of its canonical carrier', () => {
        class TransitionalExecutionError extends Error {
            readonly executionFailure = failure;
        }

        const error = new TransitionalExecutionError('Coordinator failed.');
        const normalized = normalizeExecutionError(error);

        expect(normalized.executionFailure).toBe(failure);
        expect(normalized.cause).toBe(error);
    });

    it('normalizes unknown Errors deterministically without serializing their message', () => {
        const cause = new Error('A credential-bearing vendor message.');
        const normalized = normalizeExecutionError(cause);

        expect(normalized.executionFailure).toEqual({
            code: 'unexpected-execution-error',
            message: 'An unexpected execution error occurred.',
            classification: 'internal',
            retry: 'never',
            retryable: false,
        });
        expect(normalized.cause).toBe(cause);
    });

    it('normalizes non-Error thrown values without exposing them as descriptor details', () => {
        const normalized = normalizeExecutionError({ vendor: 'raw failure' });

        expect(normalized.executionFailure.code).toBe('unexpected-execution-error');
        expect(normalized.cause).toBeUndefined();
    });
});

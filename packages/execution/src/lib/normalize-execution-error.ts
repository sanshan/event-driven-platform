import { ExecutionError } from './execution-error.js';
import { isExecutionFailure, isExecutionFailureCarrier } from './execution-failure.type-guards.js';
import type { ExecutionFailure } from './execution-failure.js';

function createUnexpectedExecutionFailure(): ExecutionFailure {
    return {
        code: 'unexpected-execution-error',
        message: 'An unexpected execution error occurred.',
        classification: 'internal',
        retry: 'never',
        retryable: false,
    };
}

/**
 * Converts an unknown thrown value to the canonical Error boundary without message parsing.
 *
 * Existing `ExecutionError` instances preserve identity. Transitional failure carriers preserve
 * their descriptor and become the cause of the canonical Error when they are Errors themselves.
 */
export function normalizeExecutionError(error: unknown): ExecutionError {
    if (error instanceof ExecutionError) {
        return error;
    }

    if (isExecutionFailureCarrier(error)) {
        return new ExecutionError(
            error.executionFailure,
            error instanceof Error ? { cause: error } : undefined,
        );
    }

    if (isExecutionFailure(error)) {
        return new ExecutionError(error);
    }

    return new ExecutionError(
        createUnexpectedExecutionFailure(),
        error instanceof Error ? { cause: error } : undefined,
    );
}

import { ExecutionFailureError } from './execution-failure-error.js';
import type { ExecutionFailure } from './execution-failure.js';

export function normalizeExecutionFailure(error: unknown): ExecutionFailure {
    if (error instanceof ExecutionFailureError) {
        return error.executionFailure;
    }

    if (error instanceof Error) {
        return {
            code: 'unexpected-execution-error',
            message: error.message,
            retryable: false,
        };
    }

    return {
        code: 'unexpected-execution-error',
        message: 'An unknown execution error occurred.',
        retryable: false,
    };
}

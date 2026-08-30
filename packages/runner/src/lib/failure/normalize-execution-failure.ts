import { isExecutionFailureCarrier, type ExecutionFailure } from '@event-driven-platform/execution';

export function normalizeExecutionFailure(error: unknown): ExecutionFailure {
    if (isExecutionFailureCarrier(error)) {
        return error.executionFailure;
    }

    if (error instanceof Error) {
        return {
            code: 'unexpected-execution-error',
            message: error.message,
            classification: 'internal',
            retry: 'never',
            retryable: false,
        };
    }

    return {
        code: 'unexpected-execution-error',
        message: 'An unknown execution error occurred.',
        classification: 'internal',
        retry: 'never',
        retryable: false,
    };
}

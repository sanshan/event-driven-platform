import type { ExecutionFailure } from '@event-driven-platform/execution';

interface ExecutionFailureCarrier {
    readonly executionFailure: ExecutionFailure;
}

function isExecutionFailureCarrier(value: unknown): value is ExecutionFailureCarrier {
    if (typeof value !== 'object' || value === null || !('executionFailure' in value)) {
        return false;
    }

    const failure = value.executionFailure;

    return (
        typeof failure === 'object' &&
        failure !== null &&
        'code' in failure &&
        typeof failure.code === 'string' &&
        'message' in failure &&
        typeof failure.message === 'string' &&
        'retryable' in failure &&
        typeof failure.retryable === 'boolean'
    );
}

export function normalizeExecutionFailure(error: unknown): ExecutionFailure {
    if (isExecutionFailureCarrier(error)) {
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

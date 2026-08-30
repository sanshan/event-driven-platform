import type { ExecutionFailureCarrier } from './execution-failure-carrier.js';
import type { ExecutionFailureClassification } from './execution-failure-classification.js';
import type { ExecutionFailureRetry } from './execution-failure-retry.js';
import type { ExecutionFailure } from './execution-failure.js';

function isExecutionFailureClassification(value: unknown): value is ExecutionFailureClassification {
    return (
        value === 'cancelled' ||
        value === 'conflict' ||
        value === 'internal' ||
        value === 'invalid-configuration' ||
        value === 'policy-rejected' ||
        value === 'timeout' ||
        value === 'unavailable'
    );
}

function isExecutionFailureRetry(value: unknown): value is ExecutionFailureRetry {
    return value === 'never' || value === 'current-execution' || value === 'caller';
}

function hasCompatibleLegacyRetryFlag(retry: ExecutionFailureRetry, retryable: unknown): boolean {
    return retryable === (retry === 'current-execution');
}

function hasOnlyExecutionFailureFields(value: object): boolean {
    return Object.keys(value).every(
        (key) =>
            key === 'code' ||
            key === 'message' ||
            key === 'classification' ||
            key === 'retry' ||
            key === 'retryable',
    );
}

export function isExecutionFailure(value: unknown): value is ExecutionFailure {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    if (!hasOnlyExecutionFailureFields(value)) {
        return false;
    }

    if (
        !('code' in value) ||
        typeof value.code !== 'string' ||
        value.code.length === 0 ||
        !('message' in value) ||
        typeof value.message !== 'string' ||
        !('classification' in value) ||
        !isExecutionFailureClassification(value.classification) ||
        !('retry' in value) ||
        !isExecutionFailureRetry(value.retry) ||
        !('retryable' in value)
    ) {
        return false;
    }

    return hasCompatibleLegacyRetryFlag(value.retry, value.retryable);
}

export function isExecutionFailureCarrier(value: unknown): value is ExecutionFailureCarrier {
    return (
        typeof value === 'object' &&
        value !== null &&
        'executionFailure' in value &&
        isExecutionFailure(value.executionFailure)
    );
}

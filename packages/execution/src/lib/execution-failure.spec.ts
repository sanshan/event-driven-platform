import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ExecutionFailureClassification } from './execution-failure-classification.js';
import type { ExecutionFailureRetry } from './execution-failure-retry.js';
import type { ExecutionFailure } from './execution-failure.js';
import { isExecutionFailure, isExecutionFailureCarrier } from './execution-failure.type-guards.js';

describe('ExecutionFailure', () => {
    it('describes one serializable failure with bounded semantics', () => {
        const failure: ExecutionFailure = {
            code: 'database-unavailable',
            message: 'The execution database is unavailable.',
            classification: 'unavailable',
            retry: 'current-execution',
            retryable: true,
        };

        expect(failure).toEqual({
            code: 'database-unavailable',
            message: 'The execution database is unavailable.',
            classification: 'unavailable',
            retry: 'current-execution',
            retryable: true,
        });

        expectTypeOf(failure.code).toEqualTypeOf<string>();
        expectTypeOf(failure.classification).toEqualTypeOf<ExecutionFailureClassification>();
        expectTypeOf<ExecutionFailure['retry']>().toEqualTypeOf<ExecutionFailureRetry>();
        expectTypeOf<ExecutionFailure['retryable']>().toEqualTypeOf<boolean>();
    });

    it('accepts only bounded classifications and consistent retry compatibility', () => {
        expect(
            isExecutionFailure({
                code: 'read-timed-out',
                message: 'The read timed out.',
                classification: 'timeout',
                retry: 'caller',
                retryable: false,
            }),
        ).toBe(true);

        expect(
            isExecutionFailure({
                code: 'read-timed-out',
                message: 'The read timed out.',
                classification: 'transport-timeout',
                retry: 'caller',
                retryable: false,
            }),
        ).toBe(false);

        expect(
            isExecutionFailure({
                code: 'read-timed-out',
                message: 'The read timed out.',
                classification: 'timeout',
                retry: 'caller',
                retryable: true,
            }),
        ).toBe(false);

        expect(
            isExecutionFailure({
                code: 'read-timed-out',
                message: 'The read timed out.',
                classification: 'timeout',
                retry: 'caller',
                retryable: false,
                details: { vendorRequestId: 'request-1' },
            }),
        ).toBe(false);
    });

    it('recognizes the canonical descriptor on structural carriers', () => {
        const carrier = {
            executionFailure: {
                code: 'execution-conflict',
                message: 'The execution conflicts with existing state.',
                classification: 'conflict',
                retry: 'never',
                retryable: false,
            },
        };

        expect(isExecutionFailureCarrier(carrier)).toBe(true);
        expect(isExecutionFailureCarrier(new Error('not a carrier'))).toBe(false);
    });
});

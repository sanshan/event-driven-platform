import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ExecutionPolicyUnavailableError } from './execution-policy-unavailable.error.js';

describe('ExecutionPolicyUnavailableError', () => {
    it('is an ExecutionFailureError', () => {
        const error = new ExecutionPolicyUnavailableError('guard');

        expect(error).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a non-retryable failure for an unavailable GuardEvaluator', () => {
        const error = new ExecutionPolicyUnavailableError('guard');

        expect(error.policy).toBe('guard');
        expect(error.executionFailure).toEqual({
            code: 'guard-evaluator-unavailable',
            message: 'Guard evaluation is configured but no GuardEvaluator is available.',
            retryable: false,
        });
    });

    it('describes a non-retryable failure for an unavailable RateLimiter', () => {
        const error = new ExecutionPolicyUnavailableError('rate-limit');

        expect(error.policy).toBe('rate-limit');
        expect(error.executionFailure).toEqual({
            code: 'rate-limiter-unavailable',
            message: 'Rate limiting is configured but no RateLimiter is available.',
            retryable: false,
        });
    });
});

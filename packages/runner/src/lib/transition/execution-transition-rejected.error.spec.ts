import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ExecutionId } from '@event-driven-platform/execution';
import type { ExecutionTransitionRejected } from '@event-driven-platform/execution-log-store';
import type { AnyOperation } from '@event-driven-platform/operation';
import { describe, expect, it } from 'vitest';

import { ExecutionTransitionRejectedError } from './execution-transition-rejected.error.js';

describe('ExecutionTransitionRejectedError', () => {
    const executionId = 'execution-1' as ExecutionId;

    it('is an ExecutionFailureError', () => {
        const rejection: ExecutionTransitionRejected<AnyOperation> = { type: 'not-found' };

        const error = new ExecutionTransitionRejectedError(executionId, 'complete', rejection);

        expect(error).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a non-retryable failure when the Execution Log entry is not found', () => {
        const rejection: ExecutionTransitionRejected<AnyOperation> = { type: 'not-found' };

        const error = new ExecutionTransitionRejectedError(executionId, 'complete', rejection);

        expect(error.executionFailure).toEqual({
            code: 'execution-not-found',
            message: `Execution "${executionId}" complete transition was rejected with "not-found".`,
            retryable: false,
        });
    });

    it('describes a non-retryable failure when the latest attempt is not in progress', () => {
        const rejection = { type: 'not-in-progress' } as ExecutionTransitionRejected<AnyOperation>;

        const error = new ExecutionTransitionRejectedError(executionId, 'fail', rejection);

        expect(error.executionFailure).toEqual({
            code: 'execution-not-in-progress',
            message: `Execution "${executionId}" fail transition was rejected with "not-in-progress".`,
            retryable: false,
        });
    });

    it('describes a non-retryable failure on lease conflict', () => {
        const rejection = { type: 'lease-conflict' } as ExecutionTransitionRejected<AnyOperation>;

        const error = new ExecutionTransitionRejectedError(executionId, 'complete', rejection);

        expect(error.executionFailure).toEqual({
            code: 'execution-lease-conflict',
            message: `Execution "${executionId}" complete transition was rejected with "lease-conflict".`,
            retryable: false,
        });
    });
});

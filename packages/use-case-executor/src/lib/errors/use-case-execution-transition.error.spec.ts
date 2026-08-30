import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ExecutionId } from '@event-driven-platform/execution';
import type { UseCaseExecutionTransitionRejected } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { UseCaseExecutionTransitionError } from './use-case-execution-transition.error.js';

describe('UseCaseExecutionTransitionError', () => {
    const executionId = 'execution-1' as ExecutionId;

    it('is an ExecutionFailureError', () => {
        const rejection: UseCaseExecutionTransitionRejected = { type: 'not-found' };

        const error = new UseCaseExecutionTransitionError(executionId, 'complete', rejection);

        expect(error).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a non-retryable failure when the UseCase execution entry is not found', () => {
        const rejection: UseCaseExecutionTransitionRejected = { type: 'not-found' };

        const error = new UseCaseExecutionTransitionError(executionId, 'complete', rejection);

        expect(error.executionFailure).toEqual({
            code: 'use-case-execution-not-found',
            message: `UseCase execution ${executionId} complete transition was rejected: not-found.`,
            retryable: false,
        });
    });

    it('describes a non-retryable failure when the execution is not in progress', () => {
        const rejection: UseCaseExecutionTransitionRejected = { type: 'not-in-progress' };

        const error = new UseCaseExecutionTransitionError(executionId, 'complete', rejection);

        expect(error.executionFailure).toEqual({
            code: 'use-case-execution-not-in-progress',
            message: `UseCase execution ${executionId} complete transition was rejected: not-in-progress.`,
            retryable: false,
        });
    });

    it('describes a non-retryable failure on lease conflict', () => {
        const rejection: UseCaseExecutionTransitionRejected = { type: 'lease-conflict' };

        const error = new UseCaseExecutionTransitionError(executionId, 'complete', rejection);

        expect(error.executionFailure).toEqual({
            code: 'use-case-execution-lease-conflict',
            message: `UseCase execution ${executionId} complete transition was rejected: lease-conflict.`,
            retryable: false,
        });
    });
});

import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ExecutionId } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ExecutionClaimRejectedError } from './execution-claim-rejected.error.js';

describe('ExecutionClaimRejectedError', () => {
    const executionId = 'execution-1' as ExecutionId;

    it('is an ExecutionFailureError', () => {
        const error = new ExecutionClaimRejectedError(executionId, 'already-in-progress');

        expect(error).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a retryable failure when another attempt is already in progress', () => {
        const error = new ExecutionClaimRejectedError(executionId, 'already-in-progress');

        expect(error.executionId).toBe(executionId);
        expect(error.reason).toBe('already-in-progress');
        expect(error.executionFailure).toEqual({
            code: 'already-in-progress',
            message: `Execution "${executionId}" is already in progress.`,
            retryable: true,
        });
    });

    it('describes a non-retryable failure on Intent conflict', () => {
        const error = new ExecutionClaimRejectedError(executionId, 'intent-conflict');

        expect(error.executionId).toBe(executionId);
        expect(error.reason).toBe('intent-conflict');
        expect(error.executionFailure).toEqual({
            code: 'intent-conflict',
            message: `Execution "${executionId}" conflicts with the persisted Operation.`,
            retryable: false,
        });
    });
});

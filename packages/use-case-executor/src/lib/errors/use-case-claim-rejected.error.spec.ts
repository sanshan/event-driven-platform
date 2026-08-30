import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ExecutionId } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { UseCaseClaimRejectedError } from './use-case-claim-rejected.error.js';

describe('UseCaseClaimRejectedError', () => {
    const executionId = 'execution-1' as ExecutionId;

    it('is an ExecutionFailureError', () => {
        const error = new UseCaseClaimRejectedError(executionId, 'already-in-progress');

        expect(error).toBeInstanceOf(ExecutionFailureError);
    });

    it('describes a retryable failure when another attempt is already in progress', () => {
        const error = new UseCaseClaimRejectedError(executionId, 'already-in-progress');

        expect(error.executionId).toBe(executionId);
        expect(error.reason).toBe('already-in-progress');
        expect(error.executionFailure).toEqual({
            code: 'already-in-progress',
            message: `UseCase execution ${executionId} is already in progress.`,
            retryable: true,
        });
    });

    it('describes a non-retryable failure on Intent conflict', () => {
        const error = new UseCaseClaimRejectedError(executionId, 'intent-conflict', 'intent-1');

        expect(error.executionId).toBe(executionId);
        expect(error.reason).toBe('intent-conflict');
        expect(error.existingIntentId).toBe('intent-1');
        expect(error.executionFailure).toEqual({
            code: 'intent-conflict',
            message: `UseCase execution ${executionId} is associated with another Intent.`,
            retryable: false,
        });
    });
});

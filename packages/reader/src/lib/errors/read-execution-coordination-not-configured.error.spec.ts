import { ExecutionFailureError } from '@event-driven-platform/execution';
import { describe, expect, it } from 'vitest';

import { ReadExecutionCoordinationNotConfiguredError } from './read-execution-coordination-not-configured.error.js';

describe('ReadExecutionCoordinationNotConfiguredError', () => {
    it('is an ExecutionFailureError', () => {
        expect(new ReadExecutionCoordinationNotConfiguredError('missing coordinator')).toBeInstanceOf(
            ExecutionFailureError,
        );
    });

    it('describes a non-retryable configuration failure', () => {
        const error = new ReadExecutionCoordinationNotConfiguredError('missing coordinator');

        expect(error.executionFailure).toEqual({
            code: 'read-execution-coordination-not-configured',
            message: 'Distributed read coordination is not configured: missing coordinator',
            retryable: false,
        });
    });
});

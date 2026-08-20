import type { ExecutionFailure } from '@event-driven-platform/execution';
import type { GuardOptions } from '@event-driven-platform/guard';

export class ExecutionGuardRejectedError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor(readonly guard: GuardOptions) {
        const message = guard.rejectWith?.reason ?? `Guard "${guard.name}" rejected execution.`;

        super(message);

        this.name = 'ExecutionGuardRejectedError';
        this.executionFailure = {
            code: guard.rejectWith?.code ?? 'guard-rejected',
            message,
            retryable: false,
        };
    }
}

import type { CommandOptions } from '@event-driven-platform/command';
import type { ExecutionFailure } from '@event-driven-platform/execution';

type ConfiguredGuard = NonNullable<CommandOptions['guards']>[number];

export class ExecutionGuardRejectedError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor(readonly guard: ConfiguredGuard) {
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

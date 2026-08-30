import type { CommandOptions } from '@event-driven-platform/command';
import { ExecutionFailureError } from '@event-driven-platform/execution';

type ConfiguredGuard = NonNullable<CommandOptions['guards']>[number];

export class ExecutionGuardRejectedError extends ExecutionFailureError {
    constructor(readonly guard: ConfiguredGuard) {
        const message = guard.rejectWith?.reason ?? `Guard "${guard.name}" rejected execution.`;

        super({
            code: guard.rejectWith?.code ?? 'guard-rejected',
            message,
            retryable: false,
        });
    }
}

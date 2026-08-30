import type { CommandOptions } from '@event-driven-platform/command';
import { ExecutionFailureError } from '@event-driven-platform/execution';

type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

export class ExecutionRateLimitRejectedError extends ExecutionFailureError {
    constructor(readonly rateLimit: ConfiguredRateLimit) {
        const message =
            rateLimit.rejectWith?.reason ?? `Rate limit "${rateLimit.key}" rejected execution.`;

        super({
            code: 'rate-limit-rejected',
            message,
            retryable: false,
        });
    }
}

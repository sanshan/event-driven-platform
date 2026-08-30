import type { CommandOptions } from '@event-driven-platform/command';
import { ExecutionError } from '@event-driven-platform/execution';

type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

export class ExecutionRateLimitRejectedError extends ExecutionError {
    constructor(readonly rateLimit: ConfiguredRateLimit) {
        const message =
            rateLimit.rejectWith?.reason ?? `Rate limit "${rateLimit.key}" rejected execution.`;

        super({
            code: 'rate-limit-rejected',
            message,
            classification: 'policy-rejected',
            retry: 'never',
            retryable: false,
        });
    }
}

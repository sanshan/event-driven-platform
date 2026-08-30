import type { CommandOptions } from '@event-driven-platform/command';
import type { ExecutionFailure } from '@event-driven-platform/execution';

type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

export class ExecutionRateLimitRejectedError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor(readonly rateLimit: ConfiguredRateLimit) {
        const message =
            rateLimit.rejectWith?.reason ?? `Rate limit "${rateLimit.key}" rejected execution.`;

        super(message);

        this.name = 'ExecutionRateLimitRejectedError';
        this.executionFailure = {
            code: 'rate-limit-rejected',
            message,
            classification: 'policy-rejected',
            retry: 'never',
            retryable: false,
        };
    }
}

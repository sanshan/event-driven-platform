import type { ExecutionFailure } from '@event-driven-platform/execution';

export class RateLimiterUnavailableError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor() {
        const message = 'Rate limiting is configured but no RateLimiter is available.';

        super(message);

        this.name = 'RateLimiterUnavailableError';
        this.executionFailure = {
            code: 'rate-limiter-unavailable',
            message,
            retryable: false,
        };
    }
}

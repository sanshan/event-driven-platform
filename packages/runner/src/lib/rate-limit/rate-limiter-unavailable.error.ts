import { ExecutionError } from '@event-driven-platform/execution';

export class RateLimiterUnavailableError extends ExecutionError {
    constructor() {
        const message = 'Rate limiting is configured but no RateLimiter is available.';

        super({
            code: 'rate-limiter-unavailable',
            message,
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    }
}

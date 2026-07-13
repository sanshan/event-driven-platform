import type { GuardOptions } from '@event-driven-platform/guard';
import type { RateLimitOptions } from '@event-driven-platform/rate-limit';
import type { RetryOptions } from '@event-driven-platform/retry';

export interface CommandOptions {
    readonly timeoutMs?: number;

    readonly retry?: RetryOptions;

    readonly rateLimit?: RateLimitOptions;

    readonly guards?: readonly GuardOptions[];
}

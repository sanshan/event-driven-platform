import type { RateLimitScope } from './rate-limit-scope.js';

export interface RateLimitOptions {
    /**
     * Deterministic identifier of the rate limit bucket.
     */
    readonly key: string;

    /**
     * Defines how Runner resolves the final bucket key.
     */
    readonly scope: RateLimitScope;

    /**
     * Maximum capacity available during the time window.
     */
    readonly limit: number;

    /**
     * Duration of the rate limit window in milliseconds.
     */
    readonly windowMs: number;

    /**
     * Capacity consumed by this Command.
     *
     * Defaults to 1 when omitted.
     */
    readonly cost?: number;

    /**
     * Rejection metadata returned when capacity is unavailable.
     */
    readonly rejectWith?: RateLimitRejection;
}

export interface RateLimitRejection {
    readonly reason: string;
}

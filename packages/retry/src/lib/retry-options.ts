import type { RetryStrategy } from './retry-strategy.js';

export interface RetryOptions {
    /**
     * Maximum number of execution attempts,
     * including the initial attempt.
     */
    readonly maxAttempts: number;

    /**
     * Strategy used by Runner to calculate
     * the delay before the next attempt.
     *
     * When omitted, retries are performed
     * without a configured delay.
     */
    readonly strategy?: RetryStrategy;
}

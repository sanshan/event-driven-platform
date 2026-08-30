export type RetryStrategy = FixedRetryStrategy | ExponentialRetryStrategy;

export interface FixedRetryStrategy {
    readonly type: 'fixed';

    readonly delayMs: number;

    /**
     * When true, the actual delay is randomized
     * between 0 and delayMs ("full jitter") to avoid
     * synchronized retries across concurrent callers.
     */
    readonly jitter?: boolean;
}

export interface FixedRetryStrategyFactory {
    create(delayMs: number, jitter?: boolean): FixedRetryStrategy;
}

export interface ExponentialRetryStrategy {
    readonly type: 'exponential';

    readonly initialDelayMs: number;

    readonly multiplier: number;

    readonly maxDelayMs?: number;

    /**
     * When true, the actual delay is randomized
     * between 0 and the computed delay ("full jitter")
     * to avoid synchronized retries across concurrent callers.
     */
    readonly jitter?: boolean;
}

export interface ExponentialRetryStrategyDescriptor {
    readonly initialDelayMs: number;

    readonly multiplier?: number;

    readonly maxDelayMs?: number;

    readonly jitter?: boolean;
}

export interface ExponentialRetryStrategyFactory {
    create(descriptor: ExponentialRetryStrategyDescriptor): ExponentialRetryStrategy;
}

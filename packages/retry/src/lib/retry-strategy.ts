export type RetryStrategy = FixedRetryStrategy | ExponentialRetryStrategy;

export interface FixedRetryStrategy {
    readonly type: 'fixed';

    readonly delayMs: number;
}

export interface FixedRetryStrategyFactory {
    create(delayMs: number): FixedRetryStrategy;
}

export interface ExponentialRetryStrategy {
    readonly type: 'exponential';

    readonly initialDelayMs: number;

    readonly multiplier: number;

    readonly maxDelayMs?: number;
}

export interface ExponentialRetryStrategyDescriptor {
    readonly initialDelayMs: number;

    readonly multiplier?: number;

    readonly maxDelayMs?: number;
}

export interface ExponentialRetryStrategyFactory {
    create(descriptor: ExponentialRetryStrategyDescriptor): ExponentialRetryStrategy;
}

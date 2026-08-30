import type {
    ExponentialRetryStrategy,
    ExponentialRetryStrategyDescriptor,
    ExponentialRetryStrategyFactory,
} from './retry-strategy.js';

const DEFAULT_MULTIPLIER = 2;

export class DefaultExponentialRetryStrategyFactory implements ExponentialRetryStrategyFactory {
    create(descriptor: ExponentialRetryStrategyDescriptor): ExponentialRetryStrategy {
        return Object.freeze({
            type: 'exponential',
            initialDelayMs: descriptor.initialDelayMs,
            multiplier: descriptor.multiplier ?? DEFAULT_MULTIPLIER,
            maxDelayMs: descriptor.maxDelayMs,
            jitter: descriptor.jitter,
        });
    }
}

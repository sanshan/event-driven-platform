import type { FixedRetryStrategy, FixedRetryStrategyFactory } from './retry-strategy.js';

export class DefaultFixedRetryStrategyFactory implements FixedRetryStrategyFactory {
    create(delayMs: number): FixedRetryStrategy {
        return Object.freeze({
            type: 'fixed',
            delayMs,
        });
    }
}

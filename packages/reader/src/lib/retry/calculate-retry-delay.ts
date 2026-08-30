import type { QueryOptions } from '@event-driven-platform/query';

type RetryStrategy = NonNullable<NonNullable<QueryOptions['retry']>['strategy']>;

export function calculateRetryDelay(strategy: RetryStrategy | undefined, retryNumber: number): number {
    if (strategy === undefined) {
        return 0;
    }

    const delay = computeDelay(strategy, retryNumber);

    if (strategy.jitter !== true || !Number.isFinite(delay)) {
        return clampDelay(delay);
    }

    return Math.random() * clampDelay(delay);
}

function computeDelay(strategy: RetryStrategy, retryNumber: number): number {
    switch (strategy.type) {
        case 'fixed':
            return strategy.delayMs;

        case 'exponential': {
            const delay = strategy.initialDelayMs * strategy.multiplier ** (retryNumber - 1);

            return strategy.maxDelayMs === undefined ? delay : Math.min(delay, strategy.maxDelayMs);
        }
    }
}

function clampDelay(delay: number): number {
    return Number.isNaN(delay) ? 0 : Math.max(0, delay);
}

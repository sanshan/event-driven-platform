import type { CommandOptions } from '@event-driven-platform/command';

type RetryStrategy = NonNullable<NonNullable<CommandOptions['retry']>['strategy']>;

export function calculateRetryDelay(strategy: RetryStrategy | undefined, retryNumber: number): number {
    if (strategy === undefined) {
        return 0;
    }

    const delay = computeDelay(strategy, retryNumber);

    if (strategy.jitter !== true || !Number.isFinite(delay)) {
        return Math.max(0, delay);
    }

    return Math.random() * Math.max(0, delay);
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

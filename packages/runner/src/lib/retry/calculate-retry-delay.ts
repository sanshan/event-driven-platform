import type { CommandOptions } from '@event-driven-platform/command';

type RetryStrategy = NonNullable<NonNullable<CommandOptions['retry']>['strategy']>;

export function calculateRetryDelay(strategy: RetryStrategy | undefined, retryNumber: number): number {
    if (strategy === undefined) {
        return 0;
    }

    const delay = computeDelay(strategy, retryNumber);

    return strategy.jitter === true ? Math.random() * delay : delay;
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

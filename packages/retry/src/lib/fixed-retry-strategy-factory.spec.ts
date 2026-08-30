import { describe, expect, it } from 'vitest';

import { DefaultFixedRetryStrategyFactory } from './fixed-retry-strategy-factory.js';

describe('DefaultFixedRetryStrategyFactory', () => {
    const factory = new DefaultFixedRetryStrategyFactory();

    it('creates a fixed retry strategy', () => {
        const strategy = factory.create(1_000);

        expect(strategy).toEqual({
            type: 'fixed',
            delayMs: 1_000,
        });
    });

    it('returns an immutable strategy', () => {
        const strategy = factory.create(1_000);

        expect(Object.isFrozen(strategy)).toBe(true);
    });

    it('creates a fixed retry strategy with jitter enabled', () => {
        const strategy = factory.create(1_000, true);

        expect(strategy).toEqual({
            type: 'fixed',
            delayMs: 1_000,
            jitter: true,
        });
    });
});

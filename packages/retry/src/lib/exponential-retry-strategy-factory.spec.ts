import { describe, expect, it } from 'vitest';

import { DefaultExponentialRetryStrategyFactory } from './exponential-retry-strategy-factory.js';

describe('DefaultExponentialRetryStrategyFactory', () => {
    const factory = new DefaultExponentialRetryStrategyFactory();

    it('creates an exponential retry strategy', () => {
        const strategy = factory.create({
            initialDelayMs: 500,
            multiplier: 3,
            maxDelayMs: 10_000,
        });

        expect(strategy).toEqual({
            type: 'exponential',
            initialDelayMs: 500,
            multiplier: 3,
            maxDelayMs: 10_000,
        });
    });

    it('uses the default multiplier', () => {
        const strategy = factory.create({
            initialDelayMs: 500,
        });

        expect(strategy.multiplier).toBe(2);
    });

    it('returns an immutable strategy', () => {
        const strategy = factory.create({
            initialDelayMs: 500,
        });

        expect(Object.isFrozen(strategy)).toBe(true);
    });

    it('creates an exponential retry strategy with jitter enabled', () => {
        const strategy = factory.create({
            initialDelayMs: 500,
            jitter: true,
        });

        expect(strategy).toEqual({
            type: 'exponential',
            initialDelayMs: 500,
            multiplier: 2,
            jitter: true,
        });
    });

    it('defaults jitter to undefined when omitted', () => {
        const strategy = factory.create({
            initialDelayMs: 500,
        });

        expect(strategy.jitter).toBeUndefined();
    });
});

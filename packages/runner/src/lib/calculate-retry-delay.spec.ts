import { describe, expect, it } from 'vitest';

import { calculateRetryDelay } from './retry/calculate-retry-delay.js';

describe('calculateRetryDelay', () => {
    it('returns zero when no strategy is configured', () => {
        expect(calculateRetryDelay(undefined, 1)).toBe(0);
    });

    it('returns the fixed delay for every retry', () => {
        const strategy = {
            type: 'fixed' as const,
            delayMs: 250,
        };

        expect(calculateRetryDelay(strategy, 1)).toBe(250);
        expect(calculateRetryDelay(strategy, 3)).toBe(250);
    });

    it('calculates exponential delays from the retry number', () => {
        const strategy = {
            type: 'exponential' as const,
            initialDelayMs: 100,
            multiplier: 2,
        };

        expect(calculateRetryDelay(strategy, 1)).toBe(100);
        expect(calculateRetryDelay(strategy, 2)).toBe(200);
        expect(calculateRetryDelay(strategy, 3)).toBe(400);
    });

    it('caps exponential delays at maxDelayMs', () => {
        const strategy = {
            type: 'exponential' as const,
            initialDelayMs: 100,
            multiplier: 3,
            maxDelayMs: 500,
        };

        expect(calculateRetryDelay(strategy, 1)).toBe(100);
        expect(calculateRetryDelay(strategy, 2)).toBe(300);
        expect(calculateRetryDelay(strategy, 3)).toBe(500);
    });
});

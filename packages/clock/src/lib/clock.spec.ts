import { describe, expect, it } from 'vitest';

import { type Clock, SystemClock } from '../index.js';

class FixedClock implements Clock {
    constructor(private readonly value: string) {}

    now(): string {
        return this.value;
    }
}

describe('Clock', () => {
    it('provides the current timestamp through an abstraction', () => {
        const clock: Clock = new FixedClock('2026-07-18T10:00:00.000Z');

        expect(clock.now()).toBe('2026-07-18T10:00:00.000Z');
    });

    it('provides an ISO timestamp through SystemClock', () => {
        const clock = new SystemClock();

        expect(Number.isNaN(Date.parse(clock.now()))).toBe(false);
    });
});

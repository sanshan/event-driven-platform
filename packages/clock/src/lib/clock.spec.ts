import { describe, expect, it } from 'vitest';

import { FixedClock, SystemClock } from '../index.js';

describe('Clock', () => {
    it('provides a configured timestamp through FixedClock', () => {
        const clock = new FixedClock('2026-07-18T10:00:00.000Z');

        expect(clock.now()).toBe('2026-07-18T10:00:00.000Z');
    });

    it('provides an ISO timestamp through SystemClock', () => {
        const clock = new SystemClock();

        expect(Number.isNaN(Date.parse(clock.now()))).toBe(false);
    });
});

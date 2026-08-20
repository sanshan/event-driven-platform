import type { Clock } from './clock.js';

export class FixedClock implements Clock {
    constructor(private readonly value: string) {}

    now(): string {
        return this.value;
    }
}

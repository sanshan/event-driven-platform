import { afterEach, describe, expect, it, vi } from 'vitest';

import { DefaultExecutionTimeout } from './timeout/default-execution-timeout.js';

afterEach(() => {
    vi.useRealTimers();
});

describe('DefaultExecutionTimeout', () => {
    it('returns a completed result when work finishes before the deadline', async () => {
        const timeout = new DefaultExecutionTimeout();

        await expect(timeout.execute(async () => 'done', 1_000)).resolves.toEqual({
            type: 'completed',
            result: 'done',
        });
    });

    it('returns timed-out when the deadline wins and ignores later completion', async () => {
        vi.useFakeTimers();

        const timeout = new DefaultExecutionTimeout();
        let completeWork: ((value: string) => void) | undefined;

        const work = new Promise<string>((resolve) => {
            completeWork = resolve;
        });

        const execution = timeout.execute(() => work, 100);

        await vi.advanceTimersByTimeAsync(100);

        await expect(execution).resolves.toEqual({
            type: 'timed-out',
        });

        completeWork?.('late-result');
        await Promise.resolve();

        await expect(execution).resolves.toEqual({
            type: 'timed-out',
        });
    });

    it('preserves an error raised before the deadline', async () => {
        const timeout = new DefaultExecutionTimeout();
        const error = new Error('Handler failed.');

        await expect(
            timeout.execute(async () => {
                throw error;
            }, 1_000),
        ).rejects.toBe(error);
    });
});

import { describe, expect, it, vi } from 'vitest';

import { NoopObserver } from './noop-observer.js';
import type { Observer } from './observer.js';
import { SafeObserver } from './safe-observer.js';

describe('observer safety', () => {
    it('suppresses delegate failures', () => {
        const delegate: Observer<string> = {
            observe: vi.fn(() => {
                throw new Error('telemetry unavailable');
            }),
        };
        const observer = new SafeObserver(delegate);

        expect(() => observer.observe('execution.completed')).not.toThrow();
        expect(delegate.observe).toHaveBeenCalledWith('execution.completed');
    });

    it('provides a no-op observer', () => {
        const observer = new NoopObserver<string>();

        expect(() => observer.observe('execution.started')).not.toThrow();
    });
});

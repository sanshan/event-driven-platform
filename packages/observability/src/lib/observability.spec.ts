import { describe, expect, it, vi } from 'vitest';

import { NoopObserver } from './observer/noop-observer.js';
import type { Observer } from './observer/observer.js';
import { SafeObserver } from './observer/safe-observer.js';

describe('observability safety', () => {
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

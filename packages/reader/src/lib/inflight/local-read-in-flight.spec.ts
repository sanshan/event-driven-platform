import type { TenantScopedReadCacheKey } from '@event-driven-platform/query';
import { describe, expect, it, vi } from 'vitest';

import { LocalReadInFlight } from './local-read-in-flight.js';

const logicalKey = {
    namespace: 'user.get',
    version: '1',
    partition: 'users',
    value: 'user-1',
} as const;

const tenantAKey: TenantScopedReadCacheKey = {
    tenant: {
        type: 'merchant',
        id: 'tenant-a' as TenantScopedReadCacheKey['tenant']['id'],
    },
    key: logicalKey,
};

const tenantBKey: TenantScopedReadCacheKey = {
    tenant: {
        type: 'merchant',
        id: 'tenant-b' as TenantScopedReadCacheKey['tenant']['id'],
    },
    key: logicalKey,
};

describe('LocalReadInFlight', () => {
    it('joins identical reads within the same tenant', async () => {
        const inFlight = new LocalReadInFlight();
        let resolve!: (value: string) => void;
        const execute = vi.fn(() => new Promise<string>((done) => {
            resolve = done;
        }));
        const onJoined = vi.fn();

        const first = inFlight.run(tenantAKey, execute);
        const second = inFlight.run(tenantAKey, execute, onJoined);

        expect(execute).toHaveBeenCalledTimes(1);
        expect(onJoined).toHaveBeenCalledTimes(1);

        resolve('value');
        await expect(Promise.all([first, second])).resolves.toEqual(['value', 'value']);
    });

    it('does not join identical logical reads across tenants', async () => {
        const inFlight = new LocalReadInFlight();
        const execute = vi.fn(async () => 'value');

        await Promise.all([
            inFlight.run(tenantAKey, execute),
            inFlight.run(tenantBKey, execute),
        ]);

        expect(execute).toHaveBeenCalledTimes(2);
    });

    it('cleans up a failed flight so the next execution can become leader', async () => {
        const inFlight = new LocalReadInFlight();
        const execute = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('failed'))
            .mockResolvedValueOnce('recovered');

        await expect(inFlight.run(tenantAKey, execute)).rejects.toThrow('failed');
        await expect(inFlight.run(tenantAKey, execute)).resolves.toBe('recovered');

        expect(execute).toHaveBeenCalledTimes(2);
    });
});

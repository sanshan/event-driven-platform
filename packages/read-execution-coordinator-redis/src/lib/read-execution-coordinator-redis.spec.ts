import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type RedisClientType } from 'redis';

import type { ReadCacheKey } from '@event-driven-platform/query';

import { RedisReadExecutionCoordinator } from './read-execution-coordinator-redis.js';

const redisUrl = process.env['READ_COORDINATOR_REDIS_URL'];
const describeRedis = redisUrl === undefined ? describe.skip : describe;

const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};

describeRedis('RedisReadExecutionCoordinator integration', () => {
    let clientA: RedisClientType;
    let clientB: RedisClientType;
    let coordinatorA: RedisReadExecutionCoordinator;
    let coordinatorB: RedisReadExecutionCoordinator;
    const prefix = `read-execution:test:${process.pid}:${Date.now()}`;

    beforeAll(async () => {
        clientA = createClient({ url: redisUrl });
        clientB = createClient({ url: redisUrl });
        await Promise.all([clientA.connect(), clientB.connect()]);
        coordinatorA = new RedisReadExecutionCoordinator(clientA, { keyPrefix: prefix });
        coordinatorB = new RedisReadExecutionCoordinator(clientB, { keyPrefix: prefix });
    });

    afterAll(async () => {
        await Promise.all([coordinatorA.close(), coordinatorB.close()]);
        await Promise.all([clientA.quit(), clientB.quit()]);
    });

    it('allows only one owner across competing coordinator instances', async () => {
        const results = await Promise.all([
            coordinatorA.claim({ key, ownerId: 'node-a', leaseDurationMs: 1000 }),
            coordinatorB.claim({ key, ownerId: 'node-b', leaseDurationMs: 1000 }),
        ]);

        expect(results.filter((result) => result.status === 'acquired')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'already-in-progress')).toHaveLength(1);

        const acquired = results.find((result) => result.status === 'acquired');
        if (acquired?.status === 'acquired') {
            await expect(coordinatorA.release({ key, lease: acquired.lease })).resolves.toMatchObject({
                status: expect.stringMatching(/released|ownership-lost/),
            });
            await expect(coordinatorB.release({ key, lease: acquired.lease })).resolves.toMatchObject({
                status: expect.stringMatching(/released|ownership-lost/),
            });
        }
    });

    it('preserves healthy ownership through renewal', async () => {
        const claim = await coordinatorA.claim({ key, ownerId: 'node-a', leaseDurationMs: 100 });
        if (claim.status !== 'acquired') {
            throw new Error('expected acquired lease');
        }

        await expect(
            coordinatorA.renew({ key, lease: claim.lease, leaseDurationMs: 500 }),
        ).resolves.toEqual({ status: 'renewed', lease: claim.lease });

        await new Promise((resolve) => setTimeout(resolve, 150));

        await expect(
            coordinatorB.claim({ key, ownerId: 'node-b', leaseDurationMs: 100 }),
        ).resolves.toEqual({ status: 'already-in-progress' });

        await coordinatorA.release({ key, lease: claim.lease });
    });

    it('permits reclaim after expiry and rejects stale release', async () => {
        const first = await coordinatorA.claim({ key, ownerId: 'node-a', leaseDurationMs: 80 });
        if (first.status !== 'acquired') {
            throw new Error('expected first lease');
        }

        await new Promise((resolve) => setTimeout(resolve, 120));

        const second = await coordinatorB.claim({ key, ownerId: 'node-b', leaseDurationMs: 500 });
        if (second.status !== 'acquired') {
            throw new Error('expected reclaimed lease');
        }

        expect(second.lease.version).toBeGreaterThan(first.lease.version);
        await expect(coordinatorA.release({ key, lease: first.lease })).resolves.toEqual({
            status: 'ownership-lost',
        });
        await expect(
            coordinatorB.renew({ key, lease: second.lease, leaseDurationMs: 500 }),
        ).resolves.toEqual({ status: 'renewed', lease: second.lease });

        await coordinatorB.release({ key, lease: second.lease });
    });

    it('wakes followers on release and bounds wait by timeout', async () => {
        const claim = await coordinatorA.claim({ key, ownerId: 'node-a', leaseDurationMs: 1000 });
        if (claim.status !== 'acquired') {
            throw new Error('expected acquired lease');
        }

        const waiting = coordinatorB.wait({ key, timeoutMs: 1000 });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await coordinatorA.release({ key, lease: claim.lease });

        await expect(waiting).resolves.toEqual({ status: 'released' });

        const second = await coordinatorA.claim({ key, ownerId: 'node-a', leaseDurationMs: 1000 });
        if (second.status !== 'acquired') {
            throw new Error('expected second lease');
        }

        await expect(coordinatorB.wait({ key, timeoutMs: 25 })).resolves.toEqual({
            status: 'timed-out',
        });

        await coordinatorA.release({ key, lease: second.lease });
    });
});

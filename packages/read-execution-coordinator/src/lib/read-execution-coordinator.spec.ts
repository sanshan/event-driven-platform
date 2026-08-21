import { describe, expect, it } from 'vitest';

import type { ReadCacheKey } from '@event-driven-platform/query';

import type {
    ClaimReadExecutionRequest,
    ClaimReadExecutionResult,
    ReadExecutionCoordinator,
    ReadExecutionLeaseReference,
    ReleaseReadExecutionRequest,
    ReleaseReadExecutionResult,
    RenewReadExecutionRequest,
    RenewReadExecutionResult,
    WaitForReadExecutionRequest,
    WaitForReadExecutionResult,
} from './read-execution-coordinator.js';

interface ActiveLease {
    readonly ownerId: string;
    readonly version: number;
    expiresAtMs: number;
}

class TestReadExecutionCoordinator implements ReadExecutionCoordinator {
    private readonly leases = new Map<string, ActiveLease>();
    private readonly versions = new Map<string, number>();

    constructor(private nowMs = 0) {}

    advance(ms: number): void {
        this.nowMs += ms;
    }

    async claim(request: ClaimReadExecutionRequest): Promise<ClaimReadExecutionResult> {
        const identity = this.identity(request.key);
        const current = this.leases.get(identity);

        if (current !== undefined && current.expiresAtMs > this.nowMs) {
            return {
                status: 'already-in-progress',
                leaseExpiresAt: new Date(current.expiresAtMs).toISOString(),
            };
        }

        const version = (this.versions.get(identity) ?? 0) + 1;
        this.versions.set(identity, version);
        this.leases.set(identity, {
            ownerId: request.ownerId,
            version,
            expiresAtMs: this.nowMs + request.leaseDurationMs,
        });

        return {
            status: 'acquired',
            lease: { ownerId: request.ownerId, version },
        };
    }

    async wait(request: WaitForReadExecutionRequest): Promise<WaitForReadExecutionResult> {
        if (request.signal?.aborted === true) {
            return { status: 'cancelled' };
        }

        const current = this.leases.get(this.identity(request.key));

        if (current === undefined || current.expiresAtMs <= this.nowMs) {
            return { status: 'released' };
        }

        return { status: 'timed-out' };
    }

    async renew(request: RenewReadExecutionRequest): Promise<RenewReadExecutionResult> {
        const identity = this.identity(request.key);
        const current = this.leases.get(identity);

        if (!this.matches(current, request.lease) || current.expiresAtMs <= this.nowMs) {
            return { status: 'ownership-lost' };
        }

        current.expiresAtMs = this.nowMs + request.leaseDurationMs;

        return {
            status: 'renewed',
            lease: request.lease,
        };
    }

    async release(request: ReleaseReadExecutionRequest): Promise<ReleaseReadExecutionResult> {
        const identity = this.identity(request.key);
        const current = this.leases.get(identity);

        if (!this.matches(current, request.lease)) {
            return { status: 'ownership-lost' };
        }

        this.leases.delete(identity);
        return { status: 'released' };
    }

    private identity(key: ReadCacheKey): string {
        return JSON.stringify([key.namespace, key.version, key.partition, key.value]);
    }

    private matches(
        current: ActiveLease | undefined,
        expected: ReadExecutionLeaseReference,
    ): current is ActiveLease {
        return (
            current !== undefined &&
            current.ownerId === expected.ownerId &&
            current.version === expected.version
        );
    }
}

const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};

describe('ReadExecutionCoordinator contract', () => {
    it('allows only one active owner for an effective read identity', async () => {
        const coordinator = new TestReadExecutionCoordinator();

        await expect(
            coordinator.claim({ key, ownerId: 'node-a', leaseDurationMs: 1000 }),
        ).resolves.toEqual({ status: 'acquired', lease: { ownerId: 'node-a', version: 1 } });

        await expect(
            coordinator.claim({ key, ownerId: 'node-b', leaseDurationMs: 1000 }),
        ).resolves.toMatchObject({ status: 'already-in-progress' });
    });

    it('increments ownership generation when an expired lease is reclaimed', async () => {
        const coordinator = new TestReadExecutionCoordinator();

        const first = await coordinator.claim({ key, ownerId: 'node-a', leaseDurationMs: 100 });
        expect(first).toEqual({ status: 'acquired', lease: { ownerId: 'node-a', version: 1 } });

        coordinator.advance(101);

        await expect(
            coordinator.claim({ key, ownerId: 'node-b', leaseDurationMs: 100 }),
        ).resolves.toEqual({ status: 'acquired', lease: { ownerId: 'node-b', version: 2 } });
    });

    it('prevents a stale owner from releasing a newer ownership generation', async () => {
        const coordinator = new TestReadExecutionCoordinator();
        const first = await coordinator.claim({ key, ownerId: 'node-a', leaseDurationMs: 100 });

        if (first.status !== 'acquired') {
            throw new Error('expected first lease');
        }

        coordinator.advance(101);
        const second = await coordinator.claim({ key, ownerId: 'node-b', leaseDurationMs: 100 });

        if (second.status !== 'acquired') {
            throw new Error('expected reclaimed lease');
        }

        await expect(coordinator.release({ key, lease: first.lease })).resolves.toEqual({
            status: 'ownership-lost',
        });
        await expect(coordinator.renew({ key, lease: second.lease, leaseDurationMs: 100 })).resolves.toEqual({
            status: 'renewed',
            lease: second.lease,
        });
    });

    it('keeps the ownership generation stable across successful renewals', async () => {
        const coordinator = new TestReadExecutionCoordinator();
        const claim = await coordinator.claim({ key, ownerId: 'node-a', leaseDurationMs: 100 });

        if (claim.status !== 'acquired') {
            throw new Error('expected acquired lease');
        }

        await expect(
            coordinator.renew({ key, lease: claim.lease, leaseDurationMs: 1000 }),
        ).resolves.toEqual({ status: 'renewed', lease: claim.lease });
    });

    it('makes follower wait timeout and cancellation explicit without transporting a result', async () => {
        const coordinator = new TestReadExecutionCoordinator();
        await coordinator.claim({ key, ownerId: 'node-a', leaseDurationMs: 1000 });

        await expect(coordinator.wait({ key, timeoutMs: 10 })).resolves.toEqual({
            status: 'timed-out',
        });

        const controller = new AbortController();
        controller.abort();

        await expect(
            coordinator.wait({ key, timeoutMs: 10, signal: controller.signal }),
        ).resolves.toEqual({ status: 'cancelled' });
    });
});

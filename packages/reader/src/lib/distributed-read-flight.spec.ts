import { describe, expect, it } from 'vitest';

import { FixedClock } from '@event-driven-platform/clock';
import type { ReaderObservation, ReaderObserver } from '@event-driven-platform/observability';
import type {
    ClaimReadExecutionResult,
    ReadExecutionCoordinator,
    ReleaseReadExecutionResult,
    RenewReadExecutionResult,
    WaitForReadExecutionResult,
} from '@event-driven-platform/read-execution-coordinator';
import type { ReadCacheKey } from '@event-driven-platform/query';
import type { AnyRead } from '@event-driven-platform/read';

import { ReadExecutionCoordinatorUnavailableError } from './errors/read-execution-coordinator-unavailable.error.js';
import { DistributedReadFlight } from './inflight/distributed-read-flight.js';

const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};

const tenant = {
    type: 'merchant',
    id: 'tenant-1' as AnyRead['tenant']['id'],
} as const;

class RecordingReaderObserver implements ReaderObserver {
    readonly observations: ReaderObservation[] = [];

    observe(observation: ReaderObservation): undefined {
        this.observations.push(observation);
        return undefined;
    }
}

function coordinatorWith(options: {
    claims: ClaimReadExecutionResult[];
    waits?: WaitForReadExecutionResult[];
}): ReadExecutionCoordinator & { claimCalls: number; waitCalls: number; releaseCalls: number } {
    let claimCalls = 0;
    let waitCalls = 0;
    let releaseCalls = 0;

    return {
        get claimCalls() {
            return claimCalls;
        },
        get waitCalls() {
            return waitCalls;
        },
        get releaseCalls() {
            return releaseCalls;
        },
        claim: async () => {
            const result = options.claims[claimCalls];
            claimCalls += 1;
            if (result === undefined) {
                throw new Error('Unexpected claim call.');
            }
            return result;
        },
        wait: async () => {
            const result = options.waits?.[waitCalls];
            waitCalls += 1;
            return result ?? { status: 'timed-out' };
        },
        renew: async (): Promise<RenewReadExecutionResult> => ({
            status: 'renewed',
            lease: { ownerId: 'owner-1', version: 1 },
        }),
        release: async (): Promise<ReleaseReadExecutionResult> => {
            releaseCalls += 1;
            return { status: 'released' };
        },
    };
}

function createFlight(coordinator: ReadExecutionCoordinator, observer = new RecordingReaderObserver()) {
    return {
        observer,
        flight: new DistributedReadFlight({
            coordinator,
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer,
            context: { read: 'wallet.get', tenant },
        }),
    };
}

describe('DistributedReadFlight', () => {
    it('double-checks shared cache after acquiring ownership before source execution', async () => {
        const coordinator = coordinatorWith({
            claims: [
                {
                    status: 'acquired',
                    lease: { ownerId: 'owner-1', version: 1 },
                },
            ],
        });
        let sourceExecutions = 0;
        let publishes = 0;
        const { flight, observer } = createFlight(coordinator);

        await expect(
            flight.run({
                key,
                ownerId: 'owner-1',
                leaseDurationMs: 1000,
                readShared: async () => ({
                    status: 'hit',
                    value: { id: 'wallet-1', balance: 10 },
                }),
                executeSource: async () => {
                    sourceExecutions += 1;
                    return { id: 'wallet-1', balance: 20 };
                },
                publishSourceResult: async () => {
                    publishes += 1;
                },
            }),
        ).resolves.toEqual({ id: 'wallet-1', balance: 10 });

        expect(sourceExecutions).toBe(0);
        expect(publishes).toBe(0);
        expect(coordinator.releaseCalls).toBe(1);
        expect(observer.observations).toContainEqual(
            expect.objectContaining({
                type: 'distributed-coordination.completed',
                outcome: 'owner',
            }),
        );
    });

    it('re-contends after follower wait when shared cache is still a miss', async () => {
        const coordinator = coordinatorWith({
            claims: [
                { status: 'already-in-progress' },
                {
                    status: 'acquired',
                    lease: { ownerId: 'owner-1', version: 2 },
                },
            ],
            waits: [{ status: 'released' }],
        });
        let sharedReads = 0;
        let sourceExecutions = 0;
        let publishes = 0;
        const { flight, observer } = createFlight(coordinator);

        await expect(
            flight.run({
                key,
                ownerId: 'owner-1',
                leaseDurationMs: 1000,
                readShared: async () => {
                    sharedReads += 1;
                    return { status: 'miss' };
                },
                executeSource: async () => {
                    sourceExecutions += 1;
                    return { id: 'wallet-1', balance: 30 };
                },
                publishSourceResult: async () => {
                    publishes += 1;
                },
            }),
        ).resolves.toEqual({ id: 'wallet-1', balance: 30 });

        expect(coordinator.claimCalls).toBe(2);
        expect(coordinator.waitCalls).toBe(1);
        expect(sharedReads).toBe(2);
        expect(sourceExecutions).toBe(1);
        expect(publishes).toBe(1);
        expect(observer.observations.map((observation) =>
            observation.type === 'distributed-coordination.completed' ? observation.outcome : null,
        )).toEqual(expect.arrayContaining(['waiter', 'owner']));
    });

    it('fails closed and observes unavailable coordination', async () => {
        const coordinator = coordinatorWith({
            claims: [{ status: 'unavailable', reason: 'redis unavailable' }],
        });
        let sourceExecutions = 0;
        const { flight, observer } = createFlight(coordinator);

        await expect(
            flight.run({
                key,
                ownerId: 'owner-1',
                leaseDurationMs: 1000,
                readShared: async () => ({ status: 'miss' }),
                executeSource: async () => {
                    sourceExecutions += 1;
                    return { id: 'wallet-1', balance: 40 };
                },
                publishSourceResult: async () => undefined,
            }),
        ).rejects.toEqual(new ReadExecutionCoordinatorUnavailableError('redis unavailable'));

        expect(sourceExecutions).toBe(0);
        expect(observer.observations).toContainEqual(
            expect.objectContaining({
                type: 'distributed-coordination.completed',
                outcome: 'unavailable',
            }),
        );
    });
});

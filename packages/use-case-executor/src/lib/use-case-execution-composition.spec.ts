import {
    DefaultExecutionIdFactory,
    type ExecutionId,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { DefaultIntentFactory, type Intent, type IntentDescriptor } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';
import type {
    ClaimUseCaseExecutionRequest,
    ClaimUseCaseExecutionResult,
    CompleteUseCaseExecutionRequest,
    CompleteUseCaseExecutionResult,
    ReleaseUseCaseExecutionRequest,
    ReleaseUseCaseExecutionResult,
    UseCaseExecutionStore,
} from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionTransitionError,
} from './use-case-executor-error.js';

const clock = { now: () => '2026-08-22T06:00:00.000Z' };
const intentFactory = new DefaultIntentFactory();
const executionIdFactory = new DefaultExecutionIdFactory();
const correlationId = 'flow-1';
const tenant = {
    type: 'merchant',
    id: 'merchant-1',
} as IntentDescriptor['tenant'];

function rootIntent(requestId: string): Intent {
    return intentFactory.create({
        namespace: 'wallet',
        action: 'provision',
        version: 1,
        tenant,
        components: { requestId },
    });
}

function createExecutor(store: UseCaseExecutionStore, ownerId: ExecutionLeaseOwnerId) {
    return new DefaultUseCaseExecutor(
        { clock, executionIdFactory, store },
        { leaseOwnerId: ownerId },
    );
}

describe('UseCase execution composition', () => {
    it('restarts incomplete orchestration, reconstructs completed child identity, and reaches unfinished child work', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const parentIntent = rootIntent('retry-safe');
        const childIds: string[] = [];
        let runs = 0;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                runs += 1;
                const firstChild = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'reserve-wallet',
                });
                childIds.push(firstChild.id);

                if (runs === 1) {
                    throw new Error('failure between child steps');
                }

                const secondChild = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'activate-wallet',
                });
                childIds.push(secondChild.id);
                return 'wallet-created';
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('failure between child steps');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('wallet-created');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('wallet-created');

        const expectedFirst = intentFactory.derive({
            parent: { id: parentIntent.id },
            slot: 'reserve-wallet',
        });
        const expectedSecond = intentFactory.derive({
            parent: { id: parentIntent.id },
            slot: 'activate-wallet',
        });

        expect(runs).toBe(2);
        expect(childIds).toEqual([expectedFirst.id, expectedFirst.id, expectedSecond.id]);
    });

    it('keeps the same semantic child Intent when retry-time payload or implementation branch changes', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const parentIntent = rootIntent('changed-state');
        const childIds: string[] = [];
        const payloadKinds: string[] = [];
        let run = 0;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                run += 1;
                const childIntent = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'provision-payment-method',
                });
                childIds.push(childIntent.id);
                payloadKinds.push(run === 1 ? 'card/EUR' : 'bank/USD');

                if (run === 1) {
                    throw new Error('retry after state change');
                }

                return 'done';
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('retry after state change');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('done');

        expect(childIds[0]).toBe(childIds[1]);
        expect(payloadKinds).toEqual(['card/EUR', 'bank/USD']);
    });

    it('keeps 1:N child identities stable across collection reordering', () => {
        const parent = rootIntent('collection-order');
        const derive = (ids: readonly string[]) =>
            Object.fromEntries(
                ids.map((id) => [
                    id,
                    intentFactory.derive({
                        parent: { id: parent.id },
                        slot: 'notify-wallet',
                        discriminator: id,
                    }).id,
                ]),
            );

        expect(derive(['wallet-3', 'wallet-1', 'wallet-2'])).toEqual(
            derive(['wallet-1', 'wallet-2', 'wallet-3']),
        );
    });

    it('rejects an active duplicate while a different parent Intent executes independently', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const firstIntent = rootIntent('active-1');
        const secondIntent = rootIntent('active-2');
        const blocked = deferred<string>();

        const firstExecution = executor.execute({
            useCase: { execute: () => blocked.promise },
            input: undefined,
            intent: firstIntent,
            correlationId,
        });

        await Promise.resolve();

        await expect(
            executor.execute({
                useCase: { execute: async () => 'duplicate' },
                input: undefined,
                intent: firstIntent,
                correlationId,
            }),
        ).rejects.toBeInstanceOf(UseCaseAlreadyInProgressError);

        await expect(
            executor.execute({
                useCase: { execute: async () => 'independent' },
                input: undefined,
                intent: secondIntent,
                correlationId,
            }),
        ).resolves.toBe('independent');

        blocked.resolve('first');
        await expect(firstExecution).resolves.toBe('first');
    });

    it('rejects stale completion after a fixed lease becomes reclaimable and another owner reclaims it', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const parentIntent = rootIntent('reclaim');
        const executionId = executionIdFactory.create(parentIntent.id);
        const blocked = deferred<string>();
        const firstExecutor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const secondExecutor = createExecutor(store, 'owner-2' as ExecutionLeaseOwnerId);

        const staleExecution = firstExecutor.execute({
            useCase: { execute: () => blocked.promise },
            input: undefined,
            intent: parentIntent,
            correlationId,
        });

        await Promise.resolve();
        store.expire(executionId);

        await expect(
            secondExecutor.execute({
                useCase: { execute: async () => 'reclaimed' },
                input: undefined,
                intent: parentIntent,
                correlationId,
            }),
        ).resolves.toBe('reclaimed');

        blocked.resolve('stale-result');
        await expect(staleExecution).rejects.toBeInstanceOf(UseCaseExecutionTransitionError);
    });
});

interface ExecutionRecord {
    readonly intentId: string;
    state: 'in-progress' | 'released' | 'completed';
    lease: ExecutionLease | null;
    result?: unknown;
    completedAt?: string;
    version: number;
    expired: boolean;
}

class StatefulUseCaseExecutionStore implements UseCaseExecutionStore {
    private readonly records = new Map<ExecutionId, ExecutionRecord>();

    async claim<TResult>(
        request: ClaimUseCaseExecutionRequest,
    ): Promise<ClaimUseCaseExecutionResult<TResult>> {
        const existing = this.records.get(request.executionId);

        if (existing && existing.intentId !== request.intent.id) {
            return { type: 'intent-conflict', existingIntentId: existing.intentId };
        }
        if (existing?.state === 'completed') {
            return {
                type: 'completed',
                result: existing.result as TResult,
                completedAt: existing.completedAt ?? request.requestedAt,
            };
        }
        if (existing?.state === 'in-progress' && existing.lease && !existing.expired) {
            return { type: 'already-in-progress', lease: existing.lease };
        }

        const version = (existing?.version ?? 0) + 1;
        const lease = createLease(request, version);
        this.records.set(request.executionId, {
            intentId: request.intent.id,
            state: 'in-progress',
            lease,
            version,
            expired: false,
        });

        return { type: 'claimed', lease };
    }

    async complete<TResult>(
        request: CompleteUseCaseExecutionRequest<TResult>,
    ): Promise<CompleteUseCaseExecutionResult> {
        const record = this.records.get(request.executionId);

        if (!record || record.state !== 'in-progress' || !record.lease) {
            return { type: 'not-in-progress' };
        }
        if (!sameLease(record.lease, request.lease)) {
            return { type: 'lease-conflict' };
        }

        record.state = 'completed';
        record.lease = null;
        record.result = request.result;
        record.completedAt = request.completedAt;
        return { type: 'completed', completedAt: request.completedAt };
    }

    async release(request: ReleaseUseCaseExecutionRequest): Promise<ReleaseUseCaseExecutionResult> {
        const record = this.records.get(request.executionId);

        if (!record || record.state !== 'in-progress' || !record.lease) {
            return { type: 'not-in-progress' };
        }
        if (!sameLease(record.lease, request.lease)) {
            return { type: 'lease-conflict' };
        }

        record.state = 'released';
        record.lease = null;
        return { type: 'released', releasedAt: request.releasedAt };
    }

    expire(executionId: ExecutionId): void {
        const record = this.records.get(executionId);
        if (record?.state === 'in-progress') {
            record.expired = true;
        }
    }
}

function createLease(request: ClaimUseCaseExecutionRequest, version: number): ExecutionLease {
    return {
        ownerId: request.leaseOwnerId,
        version,
        acquiredAt: request.requestedAt,
        expiresAt: new Date(Date.parse(request.requestedAt) + request.leaseDurationMs).toISOString(),
    } as ExecutionLease;
}

function sameLease(
    current: ExecutionLease,
    candidate: { readonly ownerId: ExecutionLease['ownerId']; readonly version: ExecutionLease['version'] },
): boolean {
    return current.ownerId === candidate.ownerId && current.version === candidate.version;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

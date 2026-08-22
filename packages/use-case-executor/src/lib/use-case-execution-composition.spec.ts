import type { Clock } from '@event-driven-platform/clock';
import {
    DefaultExecutionIdFactory,
    type ExecutionId,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { DefaultEventIdFactory, type AnyEvent } from '@event-driven-platform/event';
import {
    DefaultIntentFactory,
    type Intent,
    type IntentDescriptor,
} from '@event-driven-platform/intent';
import type { AnyOperation } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { UseCase } from '@event-driven-platform/use-case';
import type {
    ClaimUseCaseExecutionRequest,
    ClaimUseCaseExecutionResult,
    CompleteUseCaseExecutionRequest,
    CompleteUseCaseExecutionResult,
    ReleaseUseCaseExecutionRequest,
    ReleaseUseCaseExecutionResult,
    RenewUseCaseExecutionLeaseRequest,
    RenewUseCaseExecutionLeaseResult,
    UseCaseExecutionStore,
} from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionTransitionError,
} from './use-case-executor-error.js';
import type { UseCaseExecutorTimer, UseCaseExecutorTimerHandle } from './use-case-executor-timer.js';

const clock: Clock = { now: () => '2026-08-22T06:00:00.000Z' };
const intentFactory = new DefaultIntentFactory();
const executionIdFactory = new DefaultExecutionIdFactory();
const leaseOwnerId = 'use-case-executor-1' as ExecutionLeaseOwnerId;
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

function createExecutor(store: UseCaseExecutionStore, ownerId = leaseOwnerId) {
    return new DefaultUseCaseExecutor(
        {
            clock,
            executionIdFactory,
            store,
            timer: new InertTimer(),
        },
        {
            leaseOwnerId: ownerId,
            leaseDurationMs: 60_000,
        },
    );
}

describe('UseCase execution composition', () => {
    it('restarts incomplete orchestration while the same child Intent protects the completed write', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const writes = new IdempotentWriteBoundary();
        const parentIntent = rootIntent('retry-safe');
        let runs = 0;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                runs += 1;
                const childIntent = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'create-wallet',
                });
                const child = await writes.execute({
                    intent: childIntent,
                    correlationId: context.correlationId,
                    snapshot: { kind: 'CreateWallet', currency: 'EUR' },
                });

                if (runs === 1) {
                    throw new Error('failure after first child');
                }

                return child.result;
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('failure after first child');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('wallet-created');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('wallet-created');

        expect(runs).toBe(2);
        expect(writes.effectCount).toBe(1);
        expect(writes.sources).toEqual(['executed', 'stored']);
        expect(writes.intentIds[0]).toBe(writes.intentIds[1]);
        expect(writes.correlationIds).toEqual([correlationId, correlationId]);
    });

    it('does not mint a new child Intent when retry-time payload or branch selection changes', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const writes = new IdempotentWriteBoundary();
        const parentIntent = rootIntent('changed-state');
        let run = 0;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                run += 1;
                const childIntent = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'provision-payment-method',
                });
                const snapshot =
                    run === 1
                        ? { kind: 'CreateCardPaymentMethod', currency: 'EUR' }
                        : { kind: 'CreateBankPaymentMethod', currency: 'USD' };
                const child = await writes.execute({
                    intent: childIntent,
                    correlationId: context.correlationId,
                    snapshot,
                });

                if (run === 1) {
                    throw new Error('retry after state change');
                }

                return child.result;
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('retry after state change');
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toBeInstanceOf(WriteIntentConflictError);

        expect(writes.effectCount).toBe(1);
        expect(writes.intentIds).toHaveLength(2);
        expect(writes.intentIds[0]).toBe(writes.intentIds[1]);
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
                    }),
                ]),
            );
        const first = derive(['wallet-1', 'wallet-2', 'wallet-3']);
        const reordered = derive(['wallet-3', 'wallet-1', 'wallet-2']);

        expect(Object.fromEntries(Object.entries(reordered).map(([id, intent]) => [id, intent.id]))).toEqual(
            Object.fromEntries(Object.entries(first).map(([id, intent]) => [id, intent.id])),
        );
        for (const intent of Object.values(reordered)) {
            expect(intent.parent).toEqual({ id: parent.id });
        }
    });

    it('rejects an active duplicate while a different parent Intent executes independently', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const blocked = deferred<string>();
        const firstIntent = rootIntent('active-1');
        const secondIntent = rootIntent('active-2');
        const firstExecution = executor.execute({
            useCase: { execute: () => blocked.promise },
            input: undefined,
            intent: firstIntent,
            correlationId,
        });

        await flushMicrotasks();

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

    it('prevents a stale owner from completing after an abandoned execution is reclaimed', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const firstExecutor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const secondExecutor = createExecutor(store, 'owner-2' as ExecutionLeaseOwnerId);
        const parentIntent = rootIntent('reclaim');
        const blocked = deferred<string>();
        const staleExecution = firstExecutor.execute({
            useCase: { execute: () => blocked.promise },
            input: undefined,
            intent: parentIntent,
            correlationId,
        });

        await flushMicrotasks();
        store.abandon(executionIdFactory.create(parentIntent.id));

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

    it('continues Intent lineage and CorrelationId through EventEnvelope into downstream replay', async () => {
        const root = rootIntent('event-flow');
        const operationIntent = intentFactory.derive({
            parent: { id: root.id },
            slot: 'create-wallet',
        });
        const operation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent: operationIntent,
            actor: { type: 'user', id: 'user-1', origin: {} },
            tenant,
            subject: { type: 'user', id: 'user-1' },
            aggregate: { type: 'wallet', id: 'wallet-1' },
            payload: { currency: 'EUR' },
        } as AnyOperation;
        const event = {
            name: 'wallet.created',
            schemaVersion: 1,
            payload: { walletId: 'wallet-1' },
        } as AnyEvent;
        const envelopeFactory = new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        );
        const [envelope] = envelopeFactory.createMany({
            operation,
            context: { correlationId },
            events: [event],
        });

        if (!envelope) {
            throw new Error('Expected one EventEnvelope.');
        }

        expect(envelope.intentId).toBe(operationIntent.id);
        expect(envelope.correlationId).toBe(correlationId);

        const deriveDownstream = (slot: string) =>
            intentFactory.derive({
                parent: { id: envelope.intentId },
                slot,
                discriminator: envelope.eventId,
            });
        const downstreamIntent = deriveDownstream('start-wallet-fulfillment');
        const redeliveredIntent = deriveDownstream('start-wallet-fulfillment');
        const otherReaction = deriveDownstream('notify-wallet-owner');
        let runs = 0;
        const executor = createExecutor(new StatefulUseCaseExecutionStore());
        const downstreamUseCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                runs += 1;
                expect(context.intent.parent).toEqual({ id: operationIntent.id });
                expect(context.intent.derivation?.discriminator).toBe(envelope.eventId);
                expect(context.correlationId).toBe(correlationId);
                return 'downstream-result';
            },
        };

        expect(redeliveredIntent.id).toBe(downstreamIntent.id);
        expect(otherReaction.id).not.toBe(downstreamIntent.id);

        await expect(
            executor.execute({
                useCase: downstreamUseCase,
                input: undefined,
                intent: downstreamIntent,
                correlationId: envelope.correlationId,
            }),
        ).resolves.toBe('downstream-result');
        await expect(
            executor.execute({
                useCase: downstreamUseCase,
                input: undefined,
                intent: redeliveredIntent,
                correlationId: 'different-correlation-id',
            }),
        ).resolves.toBe('downstream-result');

        expect(runs).toBe(1);
    });
});

interface WriteRequest {
    readonly intent: Intent;
    readonly correlationId: string;
    readonly snapshot: Readonly<Record<string, string>>;
}

class WriteIntentConflictError extends Error {}

class IdempotentWriteBoundary {
    private readonly completed = new Map<string, { snapshot: string; result: string }>();
    readonly intentIds: string[] = [];
    readonly correlationIds: string[] = [];
    readonly sources: Array<'executed' | 'stored'> = [];
    effectCount = 0;

    async execute(request: WriteRequest): Promise<{ result: string; source: 'executed' | 'stored' }> {
        this.intentIds.push(request.intent.id);
        this.correlationIds.push(request.correlationId);
        const snapshot = JSON.stringify(request.snapshot);
        const existing = this.completed.get(request.intent.id);

        if (existing) {
            if (existing.snapshot !== snapshot) {
                throw new WriteIntentConflictError('same Intent reached the write boundary with changed work');
            }
            this.sources.push('stored');
            return { result: existing.result, source: 'stored' };
        }

        const result = 'wallet-created';
        this.completed.set(request.intent.id, { snapshot, result });
        this.effectCount += 1;
        this.sources.push('executed');
        return { result, source: 'executed' };
    }
}

interface ExecutionRecord {
    readonly intentId: string;
    state: 'in-progress' | 'released' | 'completed';
    lease: ExecutionLease | null;
    result?: unknown;
    completedAt?: string;
    leaseVersion: number;
}

class StatefulUseCaseExecutionStore implements UseCaseExecutionStore {
    private readonly records = new Map<ExecutionId, ExecutionRecord>();

    async claim<TResult>(request: ClaimUseCaseExecutionRequest): Promise<ClaimUseCaseExecutionResult<TResult>> {
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
        if (existing?.state === 'in-progress' && existing.lease) {
            return { type: 'already-in-progress', lease: existing.lease };
        }

        const leaseVersion = (existing?.leaseVersion ?? 0) + 1;
        const lease = createLease(request, leaseVersion);
        this.records.set(request.executionId, {
            intentId: request.intent.id,
            state: 'in-progress',
            lease,
            leaseVersion,
        });
        return { type: 'claimed', lease };
    }

    async renewLease(request: RenewUseCaseExecutionLeaseRequest): Promise<RenewUseCaseExecutionLeaseResult> {
        const record = this.records.get(request.executionId);
        if (!record || record.state !== 'in-progress' || !record.lease) {
            return { type: 'not-in-progress' };
        }
        if (!sameLease(record.lease, request.lease)) {
            return { type: 'lease-conflict' };
        }

        record.leaseVersion += 1;
        record.lease = {
            ownerId: record.lease.ownerId,
            version: record.leaseVersion,
            acquiredAt: request.requestedAt,
            expiresAt: addMilliseconds(request.requestedAt, request.leaseDurationMs),
        } as ExecutionLease;
        return { type: 'renewed', lease: record.lease };
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

    abandon(executionId: ExecutionId): void {
        const record = this.records.get(executionId);
        if (!record || record.state !== 'in-progress') {
            throw new Error('Expected an active execution to abandon.');
        }
        record.state = 'released';
        record.lease = null;
    }
}

class InertTimer implements UseCaseExecutorTimer {
    schedule(_delayMs: number, _callback: () => void): UseCaseExecutorTimerHandle {
        return { cancel: () => undefined };
    }
}

function createLease(request: ClaimUseCaseExecutionRequest, version: number): ExecutionLease {
    return {
        ownerId: request.leaseOwnerId,
        version,
        acquiredAt: request.requestedAt,
        expiresAt: addMilliseconds(request.requestedAt, request.leaseDurationMs),
    } as ExecutionLease;
}

function sameLease(
    current: ExecutionLease,
    expected: { readonly ownerId: ExecutionLease['ownerId']; readonly version: ExecutionLease['version'] },
): boolean {
    return current.ownerId === expected.ownerId && current.version === expected.version;
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
    return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
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

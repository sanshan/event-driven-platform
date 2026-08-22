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
    UseCaseExecutionStore,
} from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import {
    UseCaseAlreadyInProgressError,
    UseCaseExecutionTransitionError,
} from './use-case-executor-error.js';

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
        { clock, executionIdFactory, store },
        { leaseOwnerId: ownerId },
    );
}

describe('UseCase execution composition', () => {
    it('restarts incomplete orchestration and emits the same logical child Intent on retry', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const writes = new RecordingWriteBoundary();
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
        expect(writes.requests).toHaveLength(2);
        expect(writes.requests[0]?.intent.id).toBe(writes.requests[1]?.intent.id);
    });

    it('keeps the same semantic child Intent when retry-time payload or branch selection changes', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const writes = new RecordingWriteBoundary();
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
        ).resolves.toBe('wallet-created');

        expect(writes.requests[0]?.intent.id).toBe(writes.requests[1]?.intent.id);
        expect(writes.requests[0]?.snapshot).not.toEqual(writes.requests[1]?.snapshot);
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

    it('prevents a stale owner from completing after the fixed lease is reclaimed', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const firstExecutor = createExecutor(store, 'owner-1' as ExecutionLeaseOwnerId);
        const secondExecutor = createExecutor(store, 'owner-2' as ExecutionLeaseOwnerId);
        const parentIntent = rootIntent('reclaim');
        const blocked = deferred<string>();
        const executionId = executionIdFactory.create(parentIntent.id);
        const staleExecution = firstExecutor.execute({
            useCase: { execute: () => blocked.promise },
            input: undefined,
            intent: parentIntent,
            correlationId,
        });

        await flushMicrotasks();
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
        const [envelope] = new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        ).createMany({
            operation,
            context: { correlationId },
            events: [event],
        });

        if (!envelope) {
            throw new Error('Expected one EventEnvelope.');
        }

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

class RecordingWriteBoundary {
    readonly requests: WriteRequest[] = [];

    async execute(request: WriteRequest): Promise<{ result: string }> {
        this.requests.push(request);
        return { result: 'wallet-created' };
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
        const lease = {
            ownerId: request.leaseOwnerId,
            version: leaseVersion,
            acquiredAt: request.requestedAt,
            expiresAt: addMilliseconds(request.requestedAt, request.leaseDurationMs),
        } as ExecutionLease;
        this.records.set(request.executionId, {
            intentId: request.intent.id,
            state: 'in-progress',
            lease,
            leaseVersion,
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
            record.state = 'released';
            record.lease = null;
        }
    }
}

function sameLease(current: ExecutionLease, provided: { ownerId: string; version: number }): boolean {
    return current.ownerId === provided.ownerId && current.version === provided.version;
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
    return new Date(new Date(timestamp).getTime() + milliseconds).toISOString();
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

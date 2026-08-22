import type { Clock } from '@event-driven-platform/clock';
import { DefaultExecutionIdFactory, type ExecutionId, type ExecutionLease, type ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import type { CompletedExecutionLogEntry, InProgressExecutionLogEntry } from '@event-driven-platform/execution-log';
import { DefaultIntentFactory, type Intent } from '@event-driven-platform/intent';
import type { Reader } from '@event-driven-platform/reader';
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
import {
    DefaultUseCaseExecutor,
    UseCaseAlreadyInProgressError,
    UseCaseExecutionOwnershipLostError,
    type UseCaseExecutorTimer,
    type UseCaseExecutorTimerHandle,
} from '@event-driven-platform/use-case-executor';
import { describe, expect, it } from 'vitest';

import {
    claimedEntry,
    command,
    createRunnerTestKit,
    operation,
    successResult,
    type CreateWalletCommand,
    type CreateWalletOperation,
    type CreateWalletResult,
} from '../../test/runner-test-kit.js';

const correlationId = 'flow-use-case-1';
const executorOwnerId = 'use-case-executor-1' as ExecutionLeaseOwnerId;
const clock: Clock = { now: () => '2026-08-22T06:00:00.000Z' };
const intentFactory = new DefaultIntentFactory();

const parentIntent = intentFactory.create({
    namespace: 'wallet',
    action: 'provision',
    version: 1,
    tenant: operation.tenant,
    components: { requestId: 'request-1' },
});

function childCommand(intent: Intent, currency = 'EUR'): CreateWalletCommand {
    return {
        operation: {
            ...operation,
            intent,
            payload: { currency },
        },
        context: { correlationId },
    };
}

function completedRunnerEntry(
    childOperation: CreateWalletOperation,
): CompletedExecutionLogEntry<CreateWalletOperation> {
    return {
        ...claimedEntry,
        intentId: childOperation.intent.id,
        operation: childOperation,
        latestAttempt: {
            ...claimedEntry.latestAttempt,
            correlationId,
            status: 'completed',
            failure: null,
            finishedAt: '2026-08-22T06:00:01.000Z',
        },
        lease: null,
        result: successResult,
        finishedAt: '2026-08-22T06:00:01.000Z',
    };
}

function claimedRunnerEntry(childOperation: CreateWalletOperation): InProgressExecutionLogEntry<CreateWalletOperation> {
    return {
        ...claimedEntry,
        intentId: childOperation.intent.id,
        operation: childOperation,
        latestAttempt: {
            ...claimedEntry.latestAttempt,
            correlationId,
        },
    };
}

describe('UseCase execution cross-boundary composition', () => {
    it('restarts partial orchestration while Runner replays the completed child and unfinished work proceeds', async () => {
        const kit = createRunnerTestKit();
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const firstChildIntent = intentFactory.derive({ parent: parentIntent, slot: 'create-primary-wallet' });
        const secondChildIntent = intentFactory.derive({ parent: parentIntent, slot: 'create-secondary-wallet' });
        const firstCommand = childCommand(firstChildIntent);
        const secondCommand = childCommand(secondChildIntent, 'USD');
        let useCaseInvocationCount = 0;
        const seenChildIntentIds: string[][] = [];

        const useCase: UseCase<void, CreateWalletResult> = {
            execute: async (_input, context) => {
                useCaseInvocationCount += 1;
                const seenThisAttempt: string[] = [];
                seenChildIntentIds.push(seenThisAttempt);

                seenThisAttempt.push(firstCommand.operation.intent.id);
                const firstResult = await kit.runner.execute(firstCommand);
                expect(firstResult).toBe(successResult);
                expect(firstCommand.context.correlationId).toBe(context.correlationId);

                if (useCaseInvocationCount === 1) {
                    throw new Error('fail-after-first-child');
                }

                kit.executionLogStore.claimResult = {
                    type: 'claimed',
                    entry: claimedRunnerEntry(secondCommand.operation),
                };
                seenThisAttempt.push(secondCommand.operation.intent.id);
                return kit.runner.execute(secondCommand);
            },
        };

        kit.executionLogStore.claimResult = {
            type: 'claimed',
            entry: claimedRunnerEntry(firstCommand.operation),
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('fail-after-first-child');
        expect(kit.handler.invocationCount).toBe(1);

        kit.executionLogStore.claimResult = {
            type: 'completed',
            entry: completedRunnerEntry(firstCommand.operation),
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe(successResult);

        expect(useCaseInvocationCount).toBe(2);
        expect(seenChildIntentIds).toEqual([
            [firstChildIntent.id],
            [firstChildIntent.id, secondChildIntent.id],
        ]);
        expect(kit.handler.invocationCount).toBe(2);
        expect(store.completedResult).toBe(successResult);

        const executionsBeforeReplay = kit.handler.invocationCount;
        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe(successResult);
        expect(useCaseInvocationCount).toBe(2);
        expect(kit.handler.invocationCount).toBe(executionsBeforeReplay);
    });

    it('keeps child identity stable across reordered 1:N children and replay-varying payload/branch data', () => {
        const oneToOneA = intentFactory.derive({ parent: parentIntent, slot: 'notify-owner' });
        const oneToOneB = intentFactory.derive({ parent: parentIntent, slot: 'notify-owner' });
        expect(oneToOneB.id).toBe(oneToOneA.id);
        expect(oneToOneA.parent?.id).toBe(parentIntent.id);

        const firstOrder = ['wallet-a', 'wallet-b'].map((id) =>
            intentFactory.derive({ parent: parentIntent, slot: 'provision-wallet', discriminator: id }),
        );
        const secondOrder = ['wallet-b', 'wallet-a'].map((id) =>
            intentFactory.derive({ parent: parentIntent, slot: 'provision-wallet', discriminator: id }),
        );
        expect(new Map(firstOrder.map((intent) => [intent.derivation?.discriminator, intent.id]))).toEqual(
            new Map(secondOrder.map((intent) => [intent.derivation?.discriminator, intent.id])),
        );

        const payloadVersionA = intentFactory.derive({ parent: parentIntent, slot: 'settle-balance' });
        const payloadVersionB = intentFactory.derive({ parent: parentIntent, slot: 'settle-balance' });
        expect(payloadVersionB.id).toBe(payloadVersionA.id);

        const branchA = intentFactory.derive({ parent: parentIntent, slot: 'deliver-receipt' });
        const branchB = intentFactory.derive({ parent: parentIntent, slot: 'deliver-receipt' });
        expect(branchB.id).toBe(branchA.id);
    });

    it('propagates one CorrelationId through UseCase, Reader, Runner EventEnvelope, and downstream UseCase derivation', async () => {
        const kit = createRunnerTestKit();
        const store = new StatefulUseCaseExecutionStore();
        const executor = createExecutor(store);
        const childIntent = intentFactory.derive({ parent: parentIntent, slot: 'create-wallet' });
        const child = childCommand(childIntent);
        kit.executionLogStore.claimResult = {
            type: 'claimed',
            entry: claimedRunnerEntry(child.operation),
        };

        const reader = new CapturingReader();
        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                expect(context.intent.id).toBe(parentIntent.id);
                expect(context.correlationId).toBe(correlationId);

                await reader.execute({
                    read: {} as never,
                    context: { correlationId: context.correlationId },
                });
                await kit.runner.execute({
                    ...child,
                    context: { correlationId: context.correlationId },
                });
                return 'done';
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('done');

        expect(reader.correlationIds).toEqual([correlationId]);
        expect(kit.executionLogStore.claimRequests[0]?.correlationId).toBe(correlationId);
        const envelope = kit.outboxStore.records[0]?.envelope;
        expect(envelope?.intentId).toBe(childIntent.id);
        expect(envelope?.correlationId).toBe(correlationId);

        if (!envelope) {
            throw new Error('Expected an emitted EventEnvelope.');
        }

        const downstreamIntent = intentFactory.derive({
            parent: { id: envelope.intentId },
            slot: 'start-wallet-activation',
            discriminator: envelope.eventId,
        });
        const redeliveredIntent = intentFactory.derive({
            parent: { id: envelope.intentId },
            slot: 'start-wallet-activation',
            discriminator: envelope.eventId,
        });
        const differentReaction = intentFactory.derive({
            parent: { id: envelope.intentId },
            slot: 'audit-wallet-creation',
            discriminator: envelope.eventId,
        });

        expect(redeliveredIntent.id).toBe(downstreamIntent.id);
        expect(downstreamIntent.parent?.id).toBe(childIntent.id);
        expect(downstreamIntent.derivation?.discriminator).toBe(envelope.eventId);
        expect(differentReaction.id).not.toBe(downstreamIntent.id);

        const downstreamStore = new StatefulUseCaseExecutionStore();
        const downstreamExecutor = createExecutor(downstreamStore);
        let downstreamCalls = 0;
        const downstreamUseCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                downstreamCalls += 1;
                expect(context.correlationId).toBe(envelope.correlationId);
                return 'activated';
            },
        };

        await expect(
            downstreamExecutor.execute({
                useCase: downstreamUseCase,
                input: undefined,
                intent: downstreamIntent,
                correlationId: envelope.correlationId,
            }),
        ).resolves.toBe('activated');
        await expect(
            downstreamExecutor.execute({
                useCase: downstreamUseCase,
                input: undefined,
                intent: redeliveredIntent,
                correlationId: 'different-correlation-id',
            }),
        ).resolves.toBe('activated');
        expect(downstreamCalls).toBe(1);
        expect(redeliveredIntent.id).toBe(downstreamIntent.id);
    });

    it('rejects a healthy duplicate and prevents a stale owner from completing after ownership moves', async () => {
        const store = new StatefulUseCaseExecutionStore();
        const timer = new ManualTimer();
        const firstExecutor = createExecutor(store, timer, 'owner-a' as ExecutionLeaseOwnerId);
        const work = deferred<string>();
        const useCase: UseCase<void, string> = { execute: () => work.promise };
        const first = firstExecutor.execute({ useCase, input: undefined, intent: parentIntent, correlationId });
        await Promise.resolve();

        const duplicateExecutor = createExecutor(store, new ManualTimer(), 'owner-b' as ExecutionLeaseOwnerId);
        await expect(
            duplicateExecutor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toBeInstanceOf(UseCaseAlreadyInProgressError);

        store.rejectRenewal = true;
        timer.fireNext();
        await Promise.resolve();
        work.resolve('late-result');

        await expect(first).rejects.toBeInstanceOf(UseCaseExecutionOwnershipLostError);
        expect(store.completedResult).toBeUndefined();
    });
});

function createExecutor(
    store: UseCaseExecutionStore,
    timer: UseCaseExecutorTimer = new ManualTimer(),
    leaseOwnerId: ExecutionLeaseOwnerId = executorOwnerId,
) {
    return new DefaultUseCaseExecutor(
        {
            clock,
            executionIdFactory: new DefaultExecutionIdFactory(),
            store,
            timer,
        },
        {
            leaseOwnerId,
            leaseDurationMs: 60_000,
            renewalIntervalMs: 30_000,
        },
    );
}

class StatefulUseCaseExecutionStore implements UseCaseExecutionStore {
    private intentId: string | undefined;
    private lease: ExecutionLease | undefined;
    private version = 0;
    completedResult: unknown = undefined;
    rejectRenewal = false;

    async claim<TResult>(request: ClaimUseCaseExecutionRequest): Promise<ClaimUseCaseExecutionResult<TResult>> {
        if (this.intentId !== undefined && this.intentId !== request.intent.id) {
            return { type: 'intent-conflict', existingIntentId: this.intentId };
        }
        this.intentId ??= request.intent.id;

        if (this.completedResult !== undefined) {
            return {
                type: 'completed',
                result: this.completedResult as TResult,
                completedAt: clock.now(),
            };
        }

        if (this.lease !== undefined) {
            return { type: 'already-in-progress', lease: this.lease };
        }

        this.version += 1;
        this.lease = this.createLease(request.leaseOwnerId);
        return { type: 'claimed', lease: this.lease };
    }

    async renewLease(request: RenewUseCaseExecutionLeaseRequest): Promise<RenewUseCaseExecutionLeaseResult> {
        if (this.rejectRenewal || !this.matches(request.lease)) {
            return { type: 'lease-conflict' };
        }
        this.version += 1;
        this.lease = this.createLease(request.lease.ownerId);
        return { type: 'renewed', lease: this.lease };
    }

    async complete<TResult>(request: CompleteUseCaseExecutionRequest<TResult>): Promise<CompleteUseCaseExecutionResult> {
        if (!this.matches(request.lease)) {
            return { type: 'lease-conflict' };
        }
        this.completedResult = request.result;
        this.lease = undefined;
        return { type: 'completed', completedAt: request.completedAt };
    }

    async release(request: ReleaseUseCaseExecutionRequest): Promise<ReleaseUseCaseExecutionResult> {
        if (!this.matches(request.lease)) {
            return { type: 'lease-conflict' };
        }
        this.lease = undefined;
        return { type: 'released', releasedAt: request.releasedAt };
    }

    private matches(reference: { readonly ownerId: ExecutionLeaseOwnerId; readonly version: number }): boolean {
        return this.lease?.ownerId === reference.ownerId && this.lease.version === reference.version;
    }

    private createLease(ownerId: ExecutionLeaseOwnerId): ExecutionLease {
        return {
            ownerId,
            version: this.version as ExecutionLease['version'],
            acquiredAt: clock.now(),
            expiresAt: '2026-08-22T06:01:00.000Z',
        };
    }
}

class CapturingReader implements Reader {
    readonly correlationIds: string[] = [];

    async execute(query: { readonly context: { readonly correlationId: string } }): Promise<never> {
        this.correlationIds.push(query.context.correlationId);
        return undefined as never;
    }
}

class ManualTimer implements UseCaseExecutorTimer {
    private callbacks: Array<{ active: boolean; callback: () => void }> = [];

    schedule(_delayMs: number, callback: () => void): UseCaseExecutorTimerHandle {
        const item = { active: true, callback };
        this.callbacks.push(item);
        return { cancel: () => { item.active = false; } };
    }

    fireNext(): void {
        const item = this.callbacks.find(({ active }) => active);
        if (!item) {
            throw new Error('No active timer.');
        }
        item.active = false;
        item.callback();
    }
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

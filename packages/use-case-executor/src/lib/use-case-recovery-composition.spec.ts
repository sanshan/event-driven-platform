import type { CommandContext } from '@event-driven-platform/command';
import { DefaultExecutionIdFactory, type ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import { DefaultEventIdFactory, type AnyEvent } from '@event-driven-platform/event';
import {
    DefaultIntentFactory,
    type Intent,
    type IntentDescriptor,
} from '@event-driven-platform/intent';
import type { AnyOperation } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { QueryContext } from '@event-driven-platform/query';
import type { UseCase } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import type { UseCaseExecutorTimer, UseCaseExecutorTimerHandle } from './use-case-executor-timer.js';

const clock = { now: () => '2026-08-22T07:00:00.000Z' };
const correlationId = 'flow-recovery-1';
const intentFactory = new DefaultIntentFactory();
const tenant = {
    type: 'merchant',
    id: 'merchant-1',
} as IntentDescriptor['tenant'];

function createExecutor(store: UseCaseExecutionStore) {
    return new DefaultUseCaseExecutor(
        {
            clock,
            executionIdFactory: new DefaultExecutionIdFactory(),
            store,
            timer: new InertTimer(),
        },
        {
            leaseOwnerId: 'executor-1' as ExecutionLeaseOwnerId,
            leaseDurationMs: 60_000,
        },
    );
}

function rootIntent(requestId: string): Intent {
    return intentFactory.create({
        namespace: 'wallet',
        action: 'provision',
        version: 1,
        tenant,
        components: { requestId },
    });
}

describe('UseCase recovery composition matrix', () => {
    it('restarts partial orchestration from the beginning and reaches unfinished child work on retry', async () => {
        const executor = createExecutor(new ReplayStore());
        const parentIntent = rootIntent('partial-retry');
        const childCalls: string[] = [];
        let run = 0;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                run += 1;

                const firstChild = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'reserve-wallet',
                });
                childCalls.push(firstChild.id);

                if (run === 1) {
                    throw new Error('fail between child steps');
                }

                const secondChild = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'activate-wallet',
                });
                childCalls.push(secondChild.id);

                return 'completed';
            },
        };

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).rejects.toThrow('fail between child steps');

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('completed');

        await expect(
            executor.execute({ useCase, input: undefined, intent: parentIntent, correlationId }),
        ).resolves.toBe('completed');

        const expectedFirst = intentFactory.derive({
            parent: { id: parentIntent.id },
            slot: 'reserve-wallet',
        });
        const expectedSecond = intentFactory.derive({
            parent: { id: parentIntent.id },
            slot: 'activate-wallet',
        });

        expect(run).toBe(2);
        expect(childCalls).toEqual([expectedFirst.id, expectedFirst.id, expectedSecond.id]);
    });

    it('derives distinct downstream UseCase identities for different source Event IDs', () => {
        const producingIntent = intentFactory.derive({
            parent: { id: rootIntent('different-events').id },
            slot: 'create-wallet',
        });
        const operation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent: producingIntent,
            actor: { type: 'user', id: 'user-1', origin: {} },
            tenant,
            subject: { type: 'user', id: 'user-1' },
            aggregate: { type: 'wallet', id: 'wallet-1' },
            payload: {},
        } as AnyOperation;
        const events = [
            { name: 'wallet.created', schemaVersion: 1, payload: { sequence: 1 } },
            { name: 'wallet.created', schemaVersion: 1, payload: { sequence: 2 } },
        ] as readonly AnyEvent[];
        const envelopes = new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        ).createMany({
            operation,
            context: { correlationId },
            events,
        });

        const firstEnvelope = envelopes[0];
        const secondEnvelope = envelopes[1];

        if (!firstEnvelope || !secondEnvelope) {
            throw new Error('Expected two Event envelopes.');
        }

        const firstDownstream = intentFactory.derive({
            parent: { id: firstEnvelope.intentId },
            slot: 'start-wallet-fulfillment',
            discriminator: firstEnvelope.eventId,
        });
        const secondDownstream = intentFactory.derive({
            parent: { id: secondEnvelope.intentId },
            slot: 'start-wallet-fulfillment',
            discriminator: secondEnvelope.eventId,
        });

        expect(firstEnvelope.intentId).toBe(producingIntent.id);
        expect(secondEnvelope.intentId).toBe(producingIntent.id);
        expect(firstEnvelope.eventId).not.toBe(secondEnvelope.eventId);
        expect(firstDownstream.id).not.toBe(secondDownstream.id);
        expect(firstDownstream.parent).toEqual({ id: producingIntent.id });
        expect(secondDownstream.parent).toEqual({ id: producingIntent.id });
    });

    it('continues Event correlation into downstream UseCase CommandContext and QueryContext', async () => {
        const producingIntent = intentFactory.derive({
            parent: { id: rootIntent('async-correlation').id },
            slot: 'create-wallet',
        });
        const operation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent: producingIntent,
            actor: { type: 'user', id: 'user-1', origin: {} },
            tenant,
            subject: { type: 'user', id: 'user-1' },
            aggregate: { type: 'wallet', id: 'wallet-1' },
            payload: {},
        } as AnyOperation;
        const [envelope] = new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        ).createMany({
            operation,
            context: { correlationId },
            events: [
                {
                    name: 'wallet.created',
                    schemaVersion: 1,
                    payload: { walletId: 'wallet-1' },
                } as AnyEvent,
            ],
        });

        if (!envelope) {
            throw new Error('Expected one Event envelope.');
        }

        const downstreamIntent = intentFactory.derive({
            parent: { id: envelope.intentId },
            slot: 'start-wallet-fulfillment',
            discriminator: envelope.eventId,
        });
        let commandContext: CommandContext | undefined;
        let queryContext: QueryContext | undefined;
        const downstreamUseCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                commandContext = { correlationId: context.correlationId };
                queryContext = { correlationId: context.correlationId };
                return 'done';
            },
        };

        await expect(
            createExecutor(new ReplayStore()).execute({
                useCase: downstreamUseCase,
                input: undefined,
                intent: downstreamIntent,
                correlationId: envelope.correlationId,
            }),
        ).resolves.toBe('done');

        expect(envelope.correlationId).toBe(correlationId);
        expect(commandContext).toEqual({ correlationId });
        expect(queryContext).toEqual({ correlationId });
    });
});

class InertTimer implements UseCaseExecutorTimer {
    schedule(_delayMs: number, _callback: () => void): UseCaseExecutorTimerHandle {
        return { cancel: () => undefined };
    }
}

class ReplayStore implements UseCaseExecutionStore {
    private state: 'empty' | 'in-progress' | 'completed' = 'empty';
    private storedResult: unknown;
    private readonly lease = {
        ownerId: 'executor-1' as ExecutionLeaseOwnerId,
        version: 1,
        acquiredAt: clock.now(),
        expiresAt: '2026-08-22T07:01:00.000Z',
    } as const;

    async claim<TResult>() {
        if (this.state === 'completed') {
            return {
                type: 'completed' as const,
                result: this.storedResult as TResult,
                completedAt: clock.now(),
            };
        }

        this.state = 'in-progress';
        return { type: 'claimed' as const, lease: this.lease };
    }

    async renewLease() {
        return { type: 'renewed' as const, lease: this.lease };
    }

    async complete<TResult>(request: { readonly result: TResult }) {
        this.state = 'completed';
        this.storedResult = request.result;
        return { type: 'completed' as const, completedAt: clock.now() };
    }

    async release() {
        this.state = 'empty';
        return { type: 'released' as const, releasedAt: clock.now() };
    }
}

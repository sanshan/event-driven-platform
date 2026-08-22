import type { CommandContext } from '@event-driven-platform/command';
import {
    DefaultExecutionIdFactory,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { DefaultEventIdFactory, type AnyEvent } from '@event-driven-platform/event';
import { DefaultIntentFactory, type IntentDescriptor } from '@event-driven-platform/intent';
import type { AnyOperation } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { QueryContext } from '@event-driven-platform/query';
import type { UseCase } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

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
        },
        { leaseOwnerId: 'executor-1' as ExecutionLeaseOwnerId },
    );
}

describe('UseCase recovery composition matrix', () => {
    it('derives distinct downstream UseCase identities for different source Event IDs', () => {
        const producingIntent = intentFactory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            tenant,
            components: { requestId: 'different-events' },
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
        const envelopes = new DefaultOperationEventEnvelopeFactory(
            clock,
            new DefaultEventIdFactory(),
        ).createMany({
            operation,
            context: { correlationId },
            events: [
                { name: 'wallet.created', schemaVersion: 1, payload: { sequence: 1 } } as AnyEvent,
                { name: 'wallet.created', schemaVersion: 1, payload: { sequence: 2 } } as AnyEvent,
            ],
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
        const redelivery = intentFactory.derive({
            parent: { id: firstEnvelope.intentId },
            slot: 'start-wallet-fulfillment',
            discriminator: firstEnvelope.eventId,
        });
        const secondDownstream = intentFactory.derive({
            parent: { id: secondEnvelope.intentId },
            slot: 'start-wallet-fulfillment',
            discriminator: secondEnvelope.eventId,
        });

        expect(redelivery.id).toBe(firstDownstream.id);
        expect(secondDownstream.id).not.toBe(firstDownstream.id);
        expect(firstDownstream.parent).toEqual({ id: producingIntent.id });
    });

    it('continues Event correlation into downstream UseCase CommandContext and QueryContext', async () => {
        const producingIntent = intentFactory.create({
            namespace: 'wallet',
            action: 'create',
            version: 1,
            tenant,
            components: { requestId: 'async-correlation' },
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

        expect(commandContext).toEqual({ correlationId });
        expect(queryContext).toEqual({ correlationId });
    });
});

class ReplayStore implements UseCaseExecutionStore {
    private completed = false;
    private storedResult: unknown;
    private readonly lease = {
        ownerId: 'executor-1' as ExecutionLeaseOwnerId,
        version: 1,
        acquiredAt: clock.now(),
        expiresAt: '2026-08-22T07:00:30.000Z',
    } as ExecutionLease;

    async claim<TResult>() {
        if (this.completed) {
            return {
                type: 'completed' as const,
                result: this.storedResult as TResult,
                completedAt: clock.now(),
            };
        }

        return { type: 'claimed' as const, lease: this.lease };
    }

    async complete<TResult>(request: { readonly result: TResult }) {
        this.completed = true;
        this.storedResult = request.result;
        return { type: 'completed' as const, completedAt: clock.now() };
    }

    async release() {
        return { type: 'released' as const, releasedAt: clock.now() };
    }
}

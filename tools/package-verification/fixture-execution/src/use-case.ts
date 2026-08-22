import type { Clock } from '@event-driven-platform/clock';
import type { Command } from '@event-driven-platform/command';
import {
    DefaultExecutionIdFactory,
    type ExecutionId,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { DefaultEventIdFactory, type AnyEvent } from '@event-driven-platform/event';
import { DefaultIntentFactory, type IntentDescriptor } from '@event-driven-platform/intent';
import type { AnyOperation } from '@event-driven-platform/operation';
import { DefaultOperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { Query } from '@event-driven-platform/query';
import type { AnyRead } from '@event-driven-platform/read';
import type { Reader } from '@event-driven-platform/reader';
import type { Runner } from '@event-driven-platform/runner';
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
import { DefaultUseCaseExecutor } from '@event-driven-platform/use-case-executor';

const clock: Clock = { now: () => '2026-08-22T08:00:00.000Z' };
const intentFactory = new DefaultIntentFactory();
const tenant = {
    type: 'merchant',
    id: 'merchant-1',
} as IntentDescriptor['tenant'];
const correlationId = 'external-flow-1';

const runner = {
    execute: async () => ({ status: 'success', data: null, events: [] }),
    executeDetailed: async () => {
        throw new Error('Detailed Runner execution is not used by this fixture.');
    },
} as unknown as Runner;

const reader = {
    execute: async () => ({ available: true }),
} as unknown as Reader;

const rootIntent = intentFactory.create({
    namespace: 'package-verification',
    action: 'provision-wallet',
    version: 1,
    tenant,
    components: { requestId: 'request-1' },
});

const useCase: UseCase<void, string> = {
    execute: async (_input, context) => {
        const childIntent = intentFactory.derive({
            parent: { id: context.intent.id },
            slot: 'create-wallet',
        });
        const operation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent: childIntent,
            actor: { type: 'user', id: 'user-1', origin: {} },
            tenant,
            subject: { type: 'user', id: 'user-1' },
            aggregate: { type: 'wallet', id: 'wallet-1' },
            payload: { currency: 'EUR' },
        } as AnyOperation;
        const command: Command<AnyOperation> = {
            operation,
            context: { correlationId: context.correlationId },
        };

        await runner.execute(command);

        const read = {
            name: 'GetWallet',
            actor: operation.actor,
            parameters: { walletId: 'wallet-1' },
        } as AnyRead;
        const query: Query<AnyRead> = {
            read,
            context: { correlationId: context.correlationId },
        };

        await reader.execute(query);

        return 'wallet-ready';
    },
};

const store = new MemoryUseCaseExecutionStore();
const executor = new DefaultUseCaseExecutor(
    {
        clock,
        executionIdFactory: new DefaultExecutionIdFactory(),
        store,
    },
    { leaseOwnerId: 'external-executor' as ExecutionLeaseOwnerId },
);

const firstResult = await executor.execute({
    useCase,
    input: undefined,
    intent: rootIntent,
    correlationId,
});
const replayedResult = await executor.execute({
    useCase,
    input: undefined,
    intent: rootIntent,
    correlationId: 'different-correlation-same-intent',
});

if (firstResult !== 'wallet-ready' || replayedResult !== firstResult) {
    throw new Error('UseCase execution/replay verification failed.');
}

const producingIntent = intentFactory.derive({
    parent: { id: rootIntent.id },
    slot: 'create-wallet',
});
const producingOperation = {
    name: 'CreateWallet',
    schemaVersion: 1,
    intent: producingIntent,
    actor: { type: 'user', id: 'user-1', origin: {} },
    tenant,
    subject: { type: 'user', id: 'user-1' },
    aggregate: { type: 'wallet', id: 'wallet-1' },
    payload: { currency: 'EUR' },
} as AnyOperation;
const [envelope] = new DefaultOperationEventEnvelopeFactory(
    clock,
    new DefaultEventIdFactory(),
).createMany({
    operation: producingOperation,
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
    throw new Error('Expected an EventEnvelope.');
}

const downstreamIntent = intentFactory.derive({
    parent: { id: envelope.intentId },
    slot: 'start-wallet-fulfillment',
    discriminator: envelope.eventId,
});

const downstreamResult = await executor.execute({
    useCase: {
        execute: async (_input, context) => {
            if (context.correlationId !== envelope.correlationId) {
                throw new Error('CorrelationId did not continue across the Event boundary.');
            }
            return 'fulfillment-started';
        },
    },
    input: undefined,
    intent: downstreamIntent,
    correlationId: envelope.correlationId,
});

if (downstreamResult !== 'fulfillment-started') {
    throw new Error('Event-triggered UseCase composition verification failed.');
}

interface MemoryRecord {
    readonly intentId: string;
    state: 'in-progress' | 'completed' | 'released';
    lease: ExecutionLease | null;
    result?: unknown;
    completedAt?: string;
    version: number;
}

class MemoryUseCaseExecutionStore implements UseCaseExecutionStore {
    private readonly records = new Map<ExecutionId, MemoryRecord>();

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
        if (existing?.state === 'in-progress' && existing.lease) {
            return { type: 'already-in-progress', lease: existing.lease };
        }

        const version = (existing?.version ?? 0) + 1;
        const lease = {
            ownerId: request.leaseOwnerId,
            version,
            acquiredAt: request.requestedAt,
            expiresAt: new Date(
                Date.parse(request.requestedAt) + request.leaseDurationMs,
            ).toISOString(),
        } as ExecutionLease;

        this.records.set(request.executionId, {
            intentId: request.intent.id,
            state: 'in-progress',
            lease,
            version,
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

    async release(
        request: ReleaseUseCaseExecutionRequest,
    ): Promise<ReleaseUseCaseExecutionResult> {
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
}

function sameLease(
    current: ExecutionLease,
    candidate: { readonly ownerId: ExecutionLease['ownerId']; readonly version: ExecutionLease['version'] },
): boolean {
    return current.ownerId === candidate.ownerId && current.version === candidate.version;
}

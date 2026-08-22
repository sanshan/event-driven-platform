import type { CommandContext } from '@event-driven-platform/command';
import {
    DefaultExecutionIdFactory,
    type ExecutionLease,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { DefaultIntentFactory, type IntentDescriptor } from '@event-driven-platform/intent';
import type { QueryContext } from '@event-driven-platform/query';
import type { UseCase } from '@event-driven-platform/use-case';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';

const correlationId = 'flow-correlation-1';
const clock = { now: () => '2026-08-22T06:30:00.000Z' };
const intentFactory = new DefaultIntentFactory();
const parentIntent = intentFactory.create({
    namespace: 'wallet',
    action: 'inspect-and-provision',
    version: 1,
    tenant: {
        type: 'merchant',
        id: 'merchant-1',
    } as IntentDescriptor['tenant'],
    components: { requestId: 'correlation-request-1' },
});

describe('UseCase correlation composition', () => {
    it('propagates one correlationId into child CommandContext and QueryContext while Intent identity stays independent', async () => {
        const executor = new DefaultUseCaseExecutor(
            {
                clock,
                executionIdFactory: new DefaultExecutionIdFactory(),
                store: new SingleClaimStore(),
            },
            { leaseOwnerId: 'executor-1' as ExecutionLeaseOwnerId },
        );

        let receivedCommandContext: CommandContext | undefined;
        let receivedQueryContext: QueryContext | undefined;
        let receivedChildIntentId: string | undefined;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                const childIntent = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'create-wallet',
                });

                receivedCommandContext = { correlationId: context.correlationId };
                receivedQueryContext = { correlationId: context.correlationId };
                receivedChildIntentId = childIntent.id;

                return 'done';
            },
        };

        await expect(
            executor.execute({
                useCase,
                input: undefined,
                intent: parentIntent,
                correlationId,
            }),
        ).resolves.toBe('done');

        expect(receivedCommandContext).toEqual({ correlationId });
        expect(receivedQueryContext).toEqual({ correlationId });
        expect(receivedChildIntentId).toBe(
            intentFactory.derive({
                parent: { id: parentIntent.id },
                slot: 'create-wallet',
            }).id,
        );

        expect(
            intentFactory.derive({
                parent: { id: parentIntent.id },
                slot: 'create-wallet',
            }).id,
        ).toBe(receivedChildIntentId);
    });
});

class SingleClaimStore implements UseCaseExecutionStore {
    private completed = false;
    private result: unknown;
    private readonly lease = {
        ownerId: 'executor-1' as ExecutionLeaseOwnerId,
        version: 1,
        acquiredAt: clock.now(),
        expiresAt: '2026-08-22T06:30:30.000Z',
    } as ExecutionLease;

    async claim<TResult>() {
        if (this.completed) {
            return {
                type: 'completed' as const,
                result: this.result as TResult,
                completedAt: clock.now(),
            };
        }

        return { type: 'claimed' as const, lease: this.lease };
    }

    async complete<TResult>(request: { readonly result: TResult }) {
        this.completed = true;
        this.result = request.result;
        return { type: 'completed' as const, completedAt: clock.now() };
    }

    async release() {
        return { type: 'released' as const, releasedAt: clock.now() };
    }
}

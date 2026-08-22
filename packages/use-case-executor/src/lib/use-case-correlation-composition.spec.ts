import type { CommandContext } from '@event-driven-platform/command';
import type { QueryContext } from '@event-driven-platform/query';
import type { UseCase } from '@event-driven-platform/use-case';
import { describe, expect, it } from 'vitest';

import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import type { UseCaseExecutorTimer, UseCaseExecutorTimerHandle } from './use-case-executor-timer.js';

import { DefaultExecutionIdFactory, type ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import { DefaultIntentFactory, type IntentDescriptor } from '@event-driven-platform/intent';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';

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
    it('propagates one correlationId into child CommandContext and QueryContext while child Intent remains independent', async () => {
        const store = new SingleClaimStore();
        const executor = new DefaultUseCaseExecutor(
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

        let receivedCommandContext: CommandContext | undefined;
        let receivedQueryContext: QueryContext | undefined;
        let receivedChildIntentId: string | undefined;

        const useCase: UseCase<void, string> = {
            execute: async (_input, context) => {
                const childIntent = intentFactory.derive({
                    parent: { id: context.intent.id },
                    slot: 'create-wallet',
                });
                const commandContext: CommandContext = {
                    correlationId: context.correlationId,
                };
                const queryContext: QueryContext = {
                    correlationId: context.correlationId,
                };

                receivedCommandContext = commandContext;
                receivedQueryContext = queryContext;
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

        const changedCorrelationCommandContext: CommandContext = {
            correlationId: 'another-flow',
        };
        expect(changedCorrelationCommandContext.correlationId).not.toBe(correlationId);
        expect(
            intentFactory.derive({
                parent: { id: parentIntent.id },
                slot: 'create-wallet',
            }).id,
        ).toBe(receivedChildIntentId);
    });
});

class InertTimer implements UseCaseExecutorTimer {
    schedule(_delayMs: number, _callback: () => void): UseCaseExecutorTimerHandle {
        return { cancel: () => undefined };
    }
}

class SingleClaimStore implements UseCaseExecutionStore {
    private completed = false;
    private result: unknown;
    private readonly lease = {
        ownerId: 'executor-1' as ExecutionLeaseOwnerId,
        version: 1,
        acquiredAt: clock.now(),
        expiresAt: '2026-08-22T06:31:00.000Z',
    } as const;

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

    async renewLease() {
        return { type: 'renewed' as const, lease: this.lease };
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

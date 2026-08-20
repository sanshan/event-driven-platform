import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Clock } from '@event-driven-platform/clock';
import type { CommandOptions } from '@event-driven-platform/command';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';
import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';
import type { GuardOptions } from '@event-driven-platform/guard';
import type { OperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import type { OutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';
import type { RateLimitOptions } from '@event-driven-platform/rate-limit';
import type { RetryOptions } from '@event-driven-platform/retry';

import type { RunnerDependencies } from '../index.js';

describe('Execution release contract', () => {
    it('keeps Runner composition dependencies available through package-root contracts', () => {
        expectTypeOf<RunnerDependencies['clock']>().toEqualTypeOf<Clock>();
        expectTypeOf<RunnerDependencies['executionIdFactory']>().toEqualTypeOf<ExecutionIdFactory>();
        expectTypeOf<RunnerDependencies['executionLogStore']>().toEqualTypeOf<ExecutionLogStore>();
        expectTypeOf<RunnerDependencies['executionTransaction']>().toEqualTypeOf<ExecutionTransaction>();
        expectTypeOf<RunnerDependencies['operationHandlerResolver']>().toEqualTypeOf<OperationHandlerResolver>();
        expectTypeOf<RunnerDependencies['operationEventEnvelopeFactory']>().toEqualTypeOf<OperationEventEnvelopeFactory>();
        expectTypeOf<RunnerDependencies['outboxRecordFactory']>().toEqualTypeOf<OutboxRecordFactory>();
        expectTypeOf<RunnerDependencies['outboxStore']>().toEqualTypeOf<OutboxStore>();
    });

    it('keeps execution policies on CommandOptions', () => {
        const guard: GuardOptions = {
            name: 'wallet-enabled',
            params: {
                feature: 'wallets',
            },
            rejectWith: {
                code: 'wallet-disabled',
                reason: 'Wallet execution is disabled.',
            },
        };

        const rateLimit: RateLimitOptions = {
            key: 'wallet-create',
            scope: 'actor',
            limit: 10,
            windowMs: 60_000,
            cost: 1,
            rejectWith: {
                reason: 'Wallet creation rate limit exceeded.',
            },
        };

        const retry: RetryOptions = {
            maxAttempts: 3,
            strategy: {
                type: 'fixed',
                delayMs: 100,
            },
        };

        const options: CommandOptions = {
            timeoutMs: 5_000,
            guards: [guard],
            rateLimit,
            retry,
        };

        expect(options).toEqual({
            timeoutMs: 5_000,
            guards: [guard],
            rateLimit,
            retry,
        });
    });
});

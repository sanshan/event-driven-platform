import type { Clock } from '@event-driven-platform/clock';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';
import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';
import type { OperationEventEnvelopeFactory } from '@event-driven-platform/operation-event-envelope-factory';
import type { OperationHandlerResolver } from '@event-driven-platform/operation-handler-resolver';
import type { OutboxRecordFactory } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';

import type { GuardEvaluator } from '../guard/guard-evaluator.js';
import type { RateLimiter } from '../rate-limit/rate-limiter.js';
import type { RetryDelay } from '../retry/retry-delay.js';
import type { ExecutionTimeout } from '../timeout/execution-timeout.js';

export interface RunnerDependencies {
    readonly clock: Clock;

    readonly executionIdFactory: ExecutionIdFactory;

    readonly executionLogStore: ExecutionLogStore;

    readonly executionTimeout?: ExecutionTimeout;

    readonly guardEvaluator?: GuardEvaluator;

    readonly rateLimiter?: RateLimiter;

    readonly retryDelay?: RetryDelay;

    readonly operationHandlerResolver: OperationHandlerResolver;

    readonly executionTransaction: ExecutionTransaction;

    readonly operationEventEnvelopeFactory: OperationEventEnvelopeFactory;

    readonly outboxRecordFactory: OutboxRecordFactory;

    readonly outboxStore: OutboxStore;
}

import type { Clock } from '@event-driven-platform/clock';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';

import type { UseCaseExecutorTimer } from './use-case-executor-timer.js';

export interface UseCaseExecutorDependencies {
    readonly clock: Clock;
    readonly executionIdFactory: ExecutionIdFactory;
    readonly store: UseCaseExecutionStore;

    /** @internal */
    readonly timer?: UseCaseExecutorTimer;
}

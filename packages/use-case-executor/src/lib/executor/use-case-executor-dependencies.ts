import type { Clock } from '@event-driven-platform/clock';
import type { ExecutionIdFactory } from '@event-driven-platform/execution';
import type { UseCaseExecutorObserver } from '@event-driven-platform/observability';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';

export interface UseCaseExecutorDependencies {
    readonly clock: Clock;
    readonly executionIdFactory: ExecutionIdFactory;
    readonly store: UseCaseExecutionStore;
    readonly observer?: UseCaseExecutorObserver;
}

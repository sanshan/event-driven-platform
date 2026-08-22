import type { ExecutionId, ExecutionLeaseReference } from '@event-driven-platform/execution';

import type { UseCaseExecutionTransitionRejected } from './use-case-execution-transition-result.js';

export interface CompleteUseCaseExecutionRequest<TResult> {
    readonly executionId: ExecutionId;

    readonly lease: ExecutionLeaseReference;

    readonly result: TResult;

    readonly completedAt: string;
}

export interface UseCaseExecutionCompleted {
    readonly type: 'completed';

    readonly completedAt: string;
}

export type CompleteUseCaseExecutionResult =
    | UseCaseExecutionCompleted
    | UseCaseExecutionTransitionRejected;

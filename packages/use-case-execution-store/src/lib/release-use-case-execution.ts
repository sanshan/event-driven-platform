import type { ExecutionId, ExecutionLeaseReference } from '@event-driven-platform/execution';

import type { UseCaseExecutionTransitionRejected } from './use-case-execution-transition-result.js';

export interface ReleaseUseCaseExecutionRequest {
    readonly executionId: ExecutionId;

    readonly lease: ExecutionLeaseReference;

    readonly releasedAt: string;
}

export interface UseCaseExecutionReleased {
    readonly type: 'released';

    readonly releasedAt: string;
}

export type ReleaseUseCaseExecutionResult =
    | UseCaseExecutionReleased
    | UseCaseExecutionTransitionRejected;

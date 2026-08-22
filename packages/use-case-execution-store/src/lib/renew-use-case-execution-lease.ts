import type {
    ExecutionId,
    ExecutionLease,
    ExecutionLeaseReference,
} from '@event-driven-platform/execution';

import type { UseCaseExecutionTransitionRejected } from './use-case-execution-transition-result.js';

export interface RenewUseCaseExecutionLeaseRequest {
    readonly executionId: ExecutionId;

    readonly lease: ExecutionLeaseReference;

    readonly leaseDurationMs: number;

    readonly requestedAt: string;
}

export interface UseCaseExecutionLeaseRenewed {
    readonly type: 'renewed';

    readonly lease: ExecutionLease;
}

export type RenewUseCaseExecutionLeaseResult =
    | UseCaseExecutionLeaseRenewed
    | UseCaseExecutionTransitionRejected;

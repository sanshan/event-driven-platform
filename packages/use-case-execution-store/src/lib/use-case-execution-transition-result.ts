export interface UseCaseExecutionNotFound {
    readonly type: 'not-found';
}

export interface UseCaseExecutionNotInProgress {
    readonly type: 'not-in-progress';
}

export interface UseCaseExecutionLeaseConflict {
    readonly type: 'lease-conflict';
}

export type UseCaseExecutionTransitionRejected =
    | UseCaseExecutionNotFound
    | UseCaseExecutionNotInProgress
    | UseCaseExecutionLeaseConflict;

export interface CommitExecutionTransactionOutcome<TResult> {
    readonly type: 'commit';

    readonly result: TResult;
}

export interface RollbackExecutionTransactionOutcome<TResult> {
    readonly type: 'rollback';

    readonly result: TResult;
}

export type ExecutionTransactionOutcome<TResult> =
    CommitExecutionTransactionOutcome<TResult> | RollbackExecutionTransactionOutcome<TResult>;

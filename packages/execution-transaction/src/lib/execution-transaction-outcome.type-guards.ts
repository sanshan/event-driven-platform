import type {
    CommitExecutionTransactionOutcome,
    ExecutionTransactionOutcome,
    RollbackExecutionTransactionOutcome,
} from './execution-transaction-outcome.js';

export function isCommitExecutionTransactionOutcome<TResult>(
    outcome: ExecutionTransactionOutcome<TResult>,
): outcome is CommitExecutionTransactionOutcome<TResult> {
    return outcome.type === 'commit';
}

export function isRollbackExecutionTransactionOutcome<TResult>(
    outcome: ExecutionTransactionOutcome<TResult>,
): outcome is RollbackExecutionTransactionOutcome<TResult> {
    return outcome.type === 'rollback';
}

import type {
    CommitExecutionTransactionOutcome,
    RollbackExecutionTransactionOutcome,
} from './execution-transaction-outcome.js';

export const ExecutionTransactionOutcomes = {
    commit<TResult>(result: TResult): CommitExecutionTransactionOutcome<TResult> {
        return {
            type: 'commit',
            result,
        };
    },

    rollback<TResult>(result: TResult): RollbackExecutionTransactionOutcome<TResult> {
        return {
            type: 'rollback',
            result,
        };
    },
};

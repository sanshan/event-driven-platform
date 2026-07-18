export type {
    ExecutionTransaction,
    ExecutionTransactionWork,
} from './lib/execution-transaction.js';

export type {
    CommitExecutionTransactionOutcome,
    ExecutionTransactionOutcome,
    RollbackExecutionTransactionOutcome,
} from './lib/execution-transaction-outcome.js';

export { ExecutionTransactionOutcomes } from './lib/execution-transaction-outcome.factory.js';

export {
    isCommitExecutionTransactionOutcome,
    isRollbackExecutionTransactionOutcome,
} from './lib/execution-transaction-outcome.type-guards.js';

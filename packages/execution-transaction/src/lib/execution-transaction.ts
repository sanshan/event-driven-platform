import type { ExecutionTransactionOutcome } from './execution-transaction-outcome.js';

export type ExecutionTransactionWork<TResult> = () => Promise<ExecutionTransactionOutcome<TResult>>;

export interface ExecutionTransaction {
    execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult>;
}

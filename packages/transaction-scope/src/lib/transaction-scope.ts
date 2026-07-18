import type { TransactionHost } from '@event-driven-platform/transaction-host';

export type TransactionScopeWork<TResult> = () => Promise<TResult>;

/**
 * Associates a transaction resource with the current asynchronous
 * execution chain for the duration of one callback.
 *
 * The scope also acts as TransactionHost for transaction-bound
 * dependencies.
 */
export interface TransactionScope<TTransaction> extends TransactionHost<TTransaction> {
    run<TResult>(transaction: TTransaction, work: TransactionScopeWork<TResult>): Promise<TResult>;
}

export type TransactionAdapterWork<TTransaction, TResult> = (
    transaction: TTransaction,
) => Promise<TResult>;

/**
 * Adapts a concrete persistence transaction API.
 *
 * A resolved callback commits the transaction.
 * A thrown error rolls the transaction back and is rethrown.
 */
export interface TransactionAdapter<TTransaction> {
    execute<TResult>(work: TransactionAdapterWork<TTransaction, TResult>): Promise<TResult>;
}

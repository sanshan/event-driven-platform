/**
 * Provides access to the transaction resource associated with
 * the currently active transaction scope.
 *
 * Accessing transaction outside an active scope must throw
 * TransactionNotActiveError.
 */
export interface TransactionHost<TTransaction> {
    readonly transaction: TTransaction;
}

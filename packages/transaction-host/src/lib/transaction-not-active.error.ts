export class TransactionNotActiveError extends Error {
    override readonly name = 'TransactionNotActiveError';

    constructor(message = 'No active transaction is available in the current execution scope.') {
        super(message);

        Object.setPrototypeOf(this, TransactionNotActiveError.prototype);
    }
}

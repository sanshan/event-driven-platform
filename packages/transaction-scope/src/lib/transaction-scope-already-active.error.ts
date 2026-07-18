export class TransactionScopeAlreadyActiveError extends Error {
    override readonly name = 'TransactionScopeAlreadyActiveError';

    constructor(message = 'A transaction scope is already active in the current execution chain.') {
        super(message);

        Object.setPrototypeOf(this, TransactionScopeAlreadyActiveError.prototype);
    }
}

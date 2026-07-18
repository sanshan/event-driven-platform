export class RollbackExecutionTransactionSignal<TResult> extends Error {
    override readonly name = 'RollbackExecutionTransactionSignal';

    constructor(readonly result: TResult) {
        super('The execution transaction requested an explicit rollback.');

        Object.setPrototypeOf(this, RollbackExecutionTransactionSignal.prototype);
    }
}

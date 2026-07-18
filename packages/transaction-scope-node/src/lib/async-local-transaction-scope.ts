import { AsyncLocalStorage } from 'node:async_hooks';

import { TransactionNotActiveError } from '@event-driven-platform/transaction-host';
import {
    type TransactionScope,
    TransactionScopeAlreadyActiveError,
    type TransactionScopeWork,
} from '@event-driven-platform/transaction-scope';

export class AsyncLocalTransactionScope<TTransaction> implements TransactionScope<TTransaction> {
    private readonly storage = new AsyncLocalStorage<TTransaction>();

    get transaction(): TTransaction {
        const transaction = this.storage.getStore();

        if (transaction === undefined) {
            throw new TransactionNotActiveError();
        }

        return transaction;
    }

    run<TResult>(transaction: TTransaction, work: TransactionScopeWork<TResult>): Promise<TResult> {
        if (this.storage.getStore() !== undefined) {
            throw new TransactionScopeAlreadyActiveError();
        }

        return this.storage.run(transaction, work);
    }
}

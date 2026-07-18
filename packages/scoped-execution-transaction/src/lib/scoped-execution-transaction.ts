import {
    type ExecutionTransaction,
    type ExecutionTransactionWork,
    isCommitExecutionTransactionOutcome,
} from '@event-driven-platform/execution-transaction';
import type { TransactionAdapter } from '@event-driven-platform/transaction-adapter';
import type { TransactionScope } from '@event-driven-platform/transaction-scope';

import { RollbackExecutionTransactionSignal } from './rollback-execution-transaction.signal.js';

export class ScopedExecutionTransaction<TTransaction> implements ExecutionTransaction {
    constructor(
        private readonly transactionAdapter: TransactionAdapter<TTransaction>,

        private readonly transactionScope: TransactionScope<TTransaction>,
    ) {}

    async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult> {
        try {
            return await this.transactionAdapter.execute(async (transaction) =>
                this.transactionScope.run(transaction, async () => {
                    const outcome = await work();

                    if (isCommitExecutionTransactionOutcome(outcome)) {
                        return outcome.result;
                    }

                    throw new RollbackExecutionTransactionSignal(outcome.result);
                }),
            );
        } catch (error: unknown) {
            if (error instanceof RollbackExecutionTransactionSignal) {
                return error.result as TResult;
            }

            throw error;
        }
    }
}

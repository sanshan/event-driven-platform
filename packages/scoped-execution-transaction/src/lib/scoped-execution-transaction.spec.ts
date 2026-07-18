import { describe, expect, it } from 'vitest';

import { ExecutionTransactionOutcomes } from '@event-driven-platform/execution-transaction';
import type {
    TransactionAdapter,
    TransactionAdapterWork,
} from '@event-driven-platform/transaction-adapter';
import { AsyncLocalTransactionScope } from '@event-driven-platform/transaction-scope-node';

import { ScopedExecutionTransaction } from './scoped-execution-transaction.js';

interface TestTransaction {
    readonly pendingValues: string[];
}

class TestTransactionAdapter implements TransactionAdapter<TestTransaction> {
    readonly committedValues: string[] = [];

    readonly rolledBackValues: string[] = [];

    async execute<TResult>(
        work: TransactionAdapterWork<TestTransaction, TResult>,
    ): Promise<TResult> {
        const transaction: TestTransaction = {
            pendingValues: [],
        };

        try {
            const result = await work(transaction);

            this.committedValues.push(...transaction.pendingValues);

            return result;
        } catch (error: unknown) {
            this.rolledBackValues.push(...transaction.pendingValues);

            throw error;
        }
    }
}

class TestRepository {
    constructor(private readonly transactionScope: AsyncLocalTransactionScope<TestTransaction>) {}

    async save(value: string): Promise<void> {
        this.transactionScope.transaction.pendingValues.push(value);
    }
}

describe('ScopedExecutionTransaction', () => {
    it('commits work and returns the result', async () => {
        const adapter = new TestTransactionAdapter();

        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const repository = new TestRepository(scope);

        const executionTransaction = new ScopedExecutionTransaction(adapter, scope);

        const result = await executionTransaction.execute(async () => {
            await repository.save('wallet-1');

            return ExecutionTransactionOutcomes.commit({
                walletId: 'wallet-1',
            });
        });

        expect(result).toEqual({
            walletId: 'wallet-1',
        });

        expect(adapter.committedValues).toEqual(['wallet-1']);

        expect(adapter.rolledBackValues).toEqual([]);
    });

    it('rolls back work and returns the preserved result', async () => {
        const adapter = new TestTransactionAdapter();

        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const repository = new TestRepository(scope);

        const executionTransaction = new ScopedExecutionTransaction(adapter, scope);

        const result = await executionTransaction.execute(async () => {
            await repository.save('wallet-1');

            return ExecutionTransactionOutcomes.rollback({
                status: 'rejected' as const,
                reason: 'insufficient-balance',
            });
        });

        expect(result).toEqual({
            status: 'rejected',
            reason: 'insufficient-balance',
        });

        expect(adapter.committedValues).toEqual([]);

        expect(adapter.rolledBackValues).toEqual(['wallet-1']);
    });

    it('rolls back work and rethrows an unexpected error', async () => {
        const adapter = new TestTransactionAdapter();

        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const repository = new TestRepository(scope);

        const executionTransaction = new ScopedExecutionTransaction(adapter, scope);

        let thrownError: unknown;

        try {
            await executionTransaction.execute(async () => {
                await repository.save('wallet-1');

                throw new Error('Unexpected persistence failure.');
            });
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);

        expect((thrownError as Error).message).toBe('Unexpected persistence failure.');

        expect(adapter.committedValues).toEqual([]);

        expect(adapter.rolledBackValues).toEqual(['wallet-1']);
    });

    it('makes the transaction available through the ambient scope', async () => {
        const adapter = new TestTransactionAdapter();

        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const executionTransaction = new ScopedExecutionTransaction(adapter, scope);

        await executionTransaction.execute(async () => {
            expect(scope.transaction.pendingValues).toEqual([]);

            scope.transaction.pendingValues.push('wallet-1');

            await Promise.resolve();

            expect(scope.transaction.pendingValues).toEqual(['wallet-1']);

            return ExecutionTransactionOutcomes.commit(undefined);
        });

        expect(adapter.committedValues).toEqual(['wallet-1']);
    });
});

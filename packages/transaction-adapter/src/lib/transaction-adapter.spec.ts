import { describe, expect, it } from 'vitest';

import type { TransactionAdapter, TransactionAdapterWork } from '../index.js';

interface TestTransaction {
    readonly id: string;

    readonly values: string[];
}

class TestTransactionAdapter implements TransactionAdapter<TestTransaction> {
    readonly committedValues: string[] = [];

    readonly rolledBackValues: string[] = [];

    async execute<TResult>(
        work: TransactionAdapterWork<TestTransaction, TResult>,
    ): Promise<TResult> {
        const transaction: TestTransaction = {
            id: 'transaction-1',
            values: [],
        };

        try {
            const result = await work(transaction);

            this.committedValues.push(...transaction.values);

            return result;
        } catch (error: unknown) {
            this.rolledBackValues.push(...transaction.values);

            throw error;
        }
    }
}

describe('TransactionAdapter', () => {
    it('commits when work resolves', async () => {
        const adapter = new TestTransactionAdapter();

        const result = await adapter.execute(async (transaction) => {
            transaction.values.push('wallet-1');

            return {
                walletId: 'wallet-1',
            };
        });

        expect(result).toEqual({
            walletId: 'wallet-1',
        });

        expect(adapter.committedValues).toEqual(['wallet-1']);

        expect(adapter.rolledBackValues).toEqual([]);
    });

    it('rolls back and rethrows when work throws', async () => {
        const adapter = new TestTransactionAdapter();

        let thrownError: unknown;

        try {
            await adapter.execute(async (transaction) => {
                transaction.values.push('wallet-1');

                throw new Error('Transaction work failed.');
            });
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);

        expect((thrownError as Error).message).toBe('Transaction work failed.');

        expect(adapter.committedValues).toEqual([]);

        expect(adapter.rolledBackValues).toEqual(['wallet-1']);
    });
});

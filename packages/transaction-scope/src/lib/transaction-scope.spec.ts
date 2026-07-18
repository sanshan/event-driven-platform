import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    type TransactionHost,
    TransactionNotActiveError,
} from '@event-driven-platform/transaction-host';

import {
    type TransactionScope,
    TransactionScopeAlreadyActiveError,
    type TransactionScopeWork,
} from '../index.js';

interface TestTransaction {
    readonly id: string;
}

class TestTransactionScope implements TransactionScope<TestTransaction> {
    private activeTransaction: TestTransaction | null = null;

    private active = false;

    get transaction(): TestTransaction {
        if (this.activeTransaction === null) {
            throw new TransactionNotActiveError();
        }

        return this.activeTransaction;
    }

    async run<TResult>(
        transaction: TestTransaction,
        work: TransactionScopeWork<TResult>,
    ): Promise<TResult> {
        if (this.active) {
            throw new TransactionScopeAlreadyActiveError();
        }

        this.active = true;
        this.activeTransaction = transaction;

        try {
            return await work();
        } finally {
            this.activeTransaction = null;
            this.active = false;
        }
    }
}

describe('TransactionScope', () => {
    it('provides the transaction while work is executing', async () => {
        const scope = new TestTransactionScope();

        const transaction: TestTransaction = {
            id: 'transaction-1',
        };

        const result = await scope.run(transaction, async () => {
            const host: TransactionHost<TestTransaction> = scope;

            expect(host.transaction).toBe(transaction);

            return 'completed';
        });

        expect(result).toBe('completed');
    });

    it('returns the callback result', async () => {
        const scope = new TestTransactionScope();

        const result = await scope.run(
            {
                id: 'transaction-1',
            },
            async () => ({
                walletId: 'wallet-1',
            }),
        );

        expect(result).toEqual({
            walletId: 'wallet-1',
        });

        expectTypeOf(result).toEqualTypeOf<{
            walletId: string;
        }>();
    });

    it('propagates a callback error', async () => {
        const scope = new TestTransactionScope();

        let thrownError: unknown;

        try {
            await scope.run(
                {
                    id: 'transaction-1',
                },
                async () => {
                    throw new Error('Unexpected transaction work failure.');
                },
            );
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);

        expect((thrownError as Error).message).toBe('Unexpected transaction work failure.');
    });

    it('removes the transaction after successful work', async () => {
        const scope = new TestTransactionScope();

        await scope.run(
            {
                id: 'transaction-1',
            },
            async () => undefined,
        );

        expect(() => scope.transaction).toThrow(TransactionNotActiveError);
    });

    it('removes the transaction after failed work', async () => {
        const scope = new TestTransactionScope();

        try {
            await scope.run(
                {
                    id: 'transaction-1',
                },
                async () => {
                    throw new Error('Failure.');
                },
            );
        } catch {
            // Expected.
        }

        expect(() => scope.transaction).toThrow(TransactionNotActiveError);
    });

    it('rejects a nested transaction scope', async () => {
        const scope = new TestTransactionScope();

        let thrownError: unknown;

        try {
            await scope.run(
                {
                    id: 'transaction-1',
                },
                async () =>
                    scope.run(
                        {
                            id: 'transaction-2',
                        },
                        async () => undefined,
                    ),
            );
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(TransactionScopeAlreadyActiveError);
    });
});

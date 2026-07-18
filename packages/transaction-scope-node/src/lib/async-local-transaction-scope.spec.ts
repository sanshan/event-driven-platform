import { describe, expect, it } from 'vitest';

import { TransactionNotActiveError } from '@event-driven-platform/transaction-host';
import { TransactionScopeAlreadyActiveError } from '@event-driven-platform/transaction-scope';

import { AsyncLocalTransactionScope } from './async-local-transaction-scope.js';

interface TestTransaction {
    readonly id: string;
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

describe('AsyncLocalTransactionScope', () => {
    it('provides the transaction inside the active scope', async () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const transaction: TestTransaction = {
            id: 'transaction-1',
        };

        const result = await scope.run(transaction, async () => {
            expect(scope.transaction).toBe(transaction);

            await Promise.resolve();

            expect(scope.transaction).toBe(transaction);

            return 'completed';
        });

        expect(result).toBe('completed');
    });

    it('throws outside an active transaction scope', () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        expect(() => scope.transaction).toThrow(TransactionNotActiveError);
    });

    it('does not expose the transaction after the scope completes', async () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        await scope.run(
            {
                id: 'transaction-1',
            },
            async () => undefined,
        );

        expect(() => scope.transaction).toThrow(TransactionNotActiveError);
    });

    it('does not expose the transaction after work throws', async () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        let thrownError: unknown;

        try {
            await scope.run(
                {
                    id: 'transaction-1',
                },
                async () => {
                    throw new Error('Transaction work failed.');
                },
            );
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);
        expect((thrownError as Error).message).toBe('Transaction work failed.');

        expect(() => scope.transaction).toThrow(TransactionNotActiveError);
    });

    it('rejects a nested scope in the same asynchronous chain', async () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

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

    it('isolates transactions between parallel asynchronous chains', async () => {
        const scope = new AsyncLocalTransactionScope<TestTransaction>();

        const firstTransaction: TestTransaction = {
            id: 'transaction-1',
        };

        const secondTransaction: TestTransaction = {
            id: 'transaction-2',
        };

        const [firstResult, secondResult] = await Promise.all([
            scope.run(firstTransaction, async () => {
                expect(scope.transaction).toBe(firstTransaction);

                await wait(20);

                expect(scope.transaction).toBe(firstTransaction);

                return scope.transaction.id;
            }),

            scope.run(secondTransaction, async () => {
                expect(scope.transaction).toBe(secondTransaction);

                await wait(5);

                expect(scope.transaction).toBe(secondTransaction);

                return scope.transaction.id;
            }),
        ]);

        expect(firstResult).toBe('transaction-1');
        expect(secondResult).toBe('transaction-2');
    });
});

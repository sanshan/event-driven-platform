import { describe, expect, expectTypeOf, it } from 'vitest';

import { type TransactionHost, TransactionNotActiveError } from '../index.js';

interface TestTransaction {
    readonly id: string;
}

class TestTransactionHost implements TransactionHost<TestTransaction> {
    private activeTransaction: TestTransaction | null = null;

    get transaction(): TestTransaction {
        if (this.activeTransaction === null) {
            throw new TransactionNotActiveError();
        }

        return this.activeTransaction;
    }

    activate(transaction: TestTransaction): void {
        this.activeTransaction = transaction;
    }

    deactivate(): void {
        this.activeTransaction = null;
    }
}

describe('TransactionHost', () => {
    it('provides the transaction from the active scope', () => {
        const host = new TestTransactionHost();

        const transaction: TestTransaction = {
            id: 'transaction-1',
        };

        host.activate(transaction);

        expect(host.transaction).toBe(transaction);

        expectTypeOf(host.transaction).toEqualTypeOf<TestTransaction>();
    });

    it('throws when no transaction scope is active', () => {
        const host = new TestTransactionHost();

        expect(() => host.transaction).toThrow(TransactionNotActiveError);

        expect(() => host.transaction).toThrow(
            'No active transaction is available in the current execution scope.',
        );
    });

    it('does not expose the transaction after the scope is deactivated', () => {
        const host = new TestTransactionHost();

        host.activate({
            id: 'transaction-1',
        });

        host.deactivate();

        expect(() => host.transaction).toThrow(TransactionNotActiveError);
    });
});

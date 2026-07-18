import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    ExecutionTransactionOutcomes,
    isCommitExecutionTransactionOutcome,
    type ExecutionTransaction,
    type ExecutionTransactionOutcome,
    type ExecutionTransactionWork,
} from '../index.js';

class TestTransactionalRepository {
    readonly committedValues: string[] = [];

    readonly rolledBackValues: string[] = [];

    private readonly pendingValues: string[] = [];

    async save(value: string): Promise<void> {
        this.pendingValues.push(value);
    }

    commit(): void {
        this.committedValues.push(...this.pendingValues);
        this.pendingValues.length = 0;
    }

    rollback(): void {
        this.rolledBackValues.push(...this.pendingValues);
        this.pendingValues.length = 0;
    }
}

class TestExecutionTransaction implements ExecutionTransaction {
    constructor(private readonly repository: TestTransactionalRepository) {}

    async execute<TResult>(work: ExecutionTransactionWork<TResult>): Promise<TResult> {
        try {
            const outcome = await work();

            if (isCommitExecutionTransactionOutcome(outcome)) {
                this.repository.commit();

                return outcome.result;
            }

            this.repository.rollback();

            return outcome.result;
        } catch (error: unknown) {
            this.repository.rollback();

            throw error;
        }
    }
}

describe('ExecutionTransactionOutcomes', () => {
    it('creates a commit outcome', () => {
        const outcome = ExecutionTransactionOutcomes.commit({
            walletId: 'wallet-1',
        });

        expect(outcome).toEqual({
            type: 'commit',
            result: {
                walletId: 'wallet-1',
            },
        });

        expectTypeOf(outcome.result).toEqualTypeOf<{
            walletId: string;
        }>();
    });

    it('creates a rollback outcome and preserves the result', () => {
        const outcome = ExecutionTransactionOutcomes.rollback({
            status: 'rejected' as const,
            reason: 'insufficient-balance',
        });

        expect(outcome).toEqual({
            type: 'rollback',
            result: {
                status: 'rejected',
                reason: 'insufficient-balance',
            },
        });
    });
});

describe('ExecutionTransaction', () => {
    it('commits work and returns its result', async () => {
        const repository = new TestTransactionalRepository();

        const transaction = new TestExecutionTransaction(repository);

        const result = await transaction.execute(
            async (): Promise<
                ExecutionTransactionOutcome<{
                    walletId: string;
                }>
            > => {
                await repository.save('wallet-1');

                return ExecutionTransactionOutcomes.commit({
                    walletId: 'wallet-1',
                });
            },
        );

        expect(result).toEqual({
            walletId: 'wallet-1',
        });

        expect(repository.committedValues).toEqual(['wallet-1']);

        expect(repository.rolledBackValues).toEqual([]);
    });

    it('rolls back work and returns its result', async () => {
        const repository = new TestTransactionalRepository();

        const transaction = new TestExecutionTransaction(repository);

        const result = await transaction.execute(async () => {
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

        expect(repository.committedValues).toEqual([]);

        expect(repository.rolledBackValues).toEqual(['wallet-1']);
    });

    it('rolls back work and rethrows an unexpected error', async () => {
        const repository = new TestTransactionalRepository();

        const transaction = new TestExecutionTransaction(repository);

        let thrownError: unknown;

        try {
            await transaction.execute(async () => {
                await repository.save('wallet-1');

                throw new Error('Unexpected persistence failure.');
            });
        } catch (error: unknown) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);

        expect((thrownError as Error).message).toBe('Unexpected persistence failure.');

        expect(repository.committedValues).toEqual([]);

        expect(repository.rolledBackValues).toEqual(['wallet-1']);
    });
});

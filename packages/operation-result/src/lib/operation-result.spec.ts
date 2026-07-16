import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    type CommittedOperationRejection,
    isCommittedOperationRejection,
    isOperationRejection,
    isRolledBackOperationRejection,
    isSuccessfulOperationResult,
    OperationResults,
    type RolledBackOperationRejection,
    type SuccessfulOperationResult,
} from '../index.js';

describe('OperationResults', () => {
    describe('success', () => {
        it('creates a successful result with data and events', () => {
            const event = {
                name: 'wallet.created' as const,
                walletId: 'wallet-1',
            };

            const result = OperationResults.success({
                data: {
                    walletId: 'wallet-1',
                },
                events: [event],
            });

            expect(result).toEqual({
                status: 'success',
                data: {
                    walletId: 'wallet-1',
                },
                events: [event],
            });

            expectTypeOf(result).toEqualTypeOf<
                SuccessfulOperationResult<
                    {
                        walletId: string;
                    },
                    {
                        name: 'wallet.created';
                        walletId: string;
                    }
                >
            >();
        });

        it('creates a successful result without data', () => {
            const result = OperationResults.success();

            expect(result).toEqual({
                status: 'success',
                data: undefined,
                events: [],
            });

            expectTypeOf(result).toEqualTypeOf<SuccessfulOperationResult<void, never>>();
        });

        it('uses an empty event collection when events are omitted', () => {
            const result = OperationResults.success({
                data: {
                    walletId: 'wallet-1',
                },
            });

            expect(result.events).toEqual([]);
        });
    });

    describe('committedRejection', () => {
        it('creates a committed rejection with reason, data and events', () => {
            const event = {
                name: 'wallet.creation-rejected' as const,
            };

            const result = OperationResults.committedRejection({
                reason: {
                    code: 'wallet-already-exists' as const,
                },
                data: {
                    walletId: 'wallet-1',
                },
                events: [event],
            });

            expect(result).toEqual({
                status: 'rejected',
                completion: 'committed',
                reason: {
                    code: 'wallet-already-exists',
                },
                data: {
                    walletId: 'wallet-1',
                },
                events: [event],
            });

            expectTypeOf(result).toEqualTypeOf<
                CommittedOperationRejection<
                    {
                        code: 'wallet-already-exists';
                    },
                    {
                        walletId: string;
                    },
                    {
                        name: 'wallet.creation-rejected';
                    }
                >
            >();
        });

        it('creates a committed rejection without data or events', () => {
            const result = OperationResults.committedRejection({
                reason: {
                    code: 'wallet-already-exists' as const,
                },
            });

            expect(result).toEqual({
                status: 'rejected',
                completion: 'committed',
                reason: {
                    code: 'wallet-already-exists',
                },
                data: undefined,
                events: [],
            });
        });
    });

    describe('rolledBackRejection', () => {
        it('creates a rolled-back rejection with reason and data', () => {
            const result = OperationResults.rolledBackRejection({
                reason: {
                    code: 'insufficient-balance' as const,
                },
                data: {
                    available: 100,
                    requested: 150,
                },
            });

            expect(result).toEqual({
                status: 'rejected',
                completion: 'rolled-back',
                reason: {
                    code: 'insufficient-balance',
                },
                data: {
                    available: 100,
                    requested: 150,
                },
                events: [],
            });

            expectTypeOf(result).toEqualTypeOf<
                RolledBackOperationRejection<
                    {
                        code: 'insufficient-balance';
                    },
                    {
                        available: number;
                        requested: number;
                    }
                >
            >();

            expectTypeOf(result.events).toEqualTypeOf<readonly []>();
        });

        it('creates a rolled-back rejection without data', () => {
            const result = OperationResults.rolledBackRejection({
                reason: {
                    code: 'account-blocked' as const,
                },
            });

            expect(result).toEqual({
                status: 'rejected',
                completion: 'rolled-back',
                reason: {
                    code: 'account-blocked',
                },
                data: undefined,
                events: [],
            });
        });

        it('does not accept events', () => {
            OperationResults.rolledBackRejection({
                reason: {
                    code: 'insufficient-balance',
                },

                // @ts-expect-error rolled-back rejection cannot produce events
                events: [
                    {
                        name: 'balance.change-rejected',
                    },
                ],
            });
        });
    });
});

describe('OperationResult type guards', () => {
    type ChangeBalanceResult =
        | SuccessfulOperationResult<
              {
                  previousBalance: number;
                  currentBalance: number;
              },
              {
                  name: 'balance.changed';
              }
          >
        | CommittedOperationRejection<
              {
                  code: 'attempt-recorded';
              },
              {
                  attemptId: string;
              },
              {
                  name: 'balance.change-rejected';
              }
          >
        | RolledBackOperationRejection<
              {
                  code: 'insufficient-balance';
              },
              {
                  available: number;
                  requested: number;
              }
          >;

    const results: readonly ChangeBalanceResult[] = [
        OperationResults.success({
            data: {
                previousBalance: 100,
                currentBalance: 50,
            },
            events: [
                {
                    name: 'balance.changed',
                },
            ],
        }),
        OperationResults.committedRejection({
            reason: {
                code: 'attempt-recorded',
            },
            data: {
                attemptId: 'attempt-1',
            },
            events: [
                {
                    name: 'balance.change-rejected',
                },
            ],
        }),
        OperationResults.rolledBackRejection({
            reason: {
                code: 'insufficient-balance',
            },
            data: {
                available: 100,
                requested: 150,
            },
        }),
    ];

    it('identifies successful results', () => {
        const result = results[0];

        expect(result).toBeDefined();

        if (result === undefined) {
            throw new Error('Expected result');
        }

        expect(isSuccessfulOperationResult(result)).toBe(true);

        if (isSuccessfulOperationResult(result)) {
            expectTypeOf(result.data).toEqualTypeOf<{
                previousBalance: number;
                currentBalance: number;
            }>();

            expect(result.data.currentBalance).toBe(50);
        }
    });

    it('identifies any rejection', () => {
        const result = results[1];

        expect(result).toBeDefined();

        if (result === undefined) {
            throw new Error('Expected result');
        }

        expect(isOperationRejection(result)).toBe(true);

        if (isOperationRejection(result)) {
            expect(result.status).toBe('rejected');
        }
    });

    it('identifies committed rejections', () => {
        const result = results[1];

        expect(result).toBeDefined();

        if (result === undefined) {
            throw new Error('Expected result');
        }

        expect(isCommittedOperationRejection(result)).toBe(true);

        if (isCommittedOperationRejection(result)) {
            expectTypeOf(result.data).toEqualTypeOf<{
                attemptId: string;
            }>();

            expect(result.data.attemptId).toBe('attempt-1');
        }
    });

    it('identifies rolled-back rejections', () => {
        const result = results[2];

        expect(result).toBeDefined();

        if (result === undefined) {
            throw new Error('Expected result');
        }

        expect(isRolledBackOperationRejection(result)).toBe(true);

        if (isRolledBackOperationRejection(result)) {
            expectTypeOf(result.data).toEqualTypeOf<{
                available: number;
                requested: number;
            }>();

            expect(result.data.available).toBe(100);
            expect(result.events).toEqual([]);
        }
    });
});

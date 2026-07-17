import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Event } from '@event-driven-platform/event';

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

interface WalletCreatedPayload {
    readonly walletId: string;
}

type WalletCreatedEvent = Event<'wallet.created', 1, WalletCreatedPayload>;

interface WalletCreationRejectedPayload {
    readonly walletId: string;
}

type WalletCreationRejectedEvent = Event<
    'wallet.creation-rejected',
    1,
    WalletCreationRejectedPayload
>;

interface BalanceChangedPayload {
    readonly previousBalance: number;
    readonly currentBalance: number;
}

type BalanceChangedEvent = Event<'balance.changed', 1, BalanceChangedPayload>;

interface BalanceChangeRejectedPayload {
    readonly attemptId: string;
}

type BalanceChangeRejectedEvent = Event<'balance.change-rejected', 1, BalanceChangeRejectedPayload>;

describe('OperationResults', () => {
    describe('success', () => {
        it('creates a successful result with data and events', () => {
            const event: WalletCreatedEvent = {
                name: 'wallet.created',
                schemaVersion: 1,
                payload: {
                    walletId: 'wallet-1',
                },
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
                events: [
                    {
                        name: 'wallet.created',
                        schemaVersion: 1,
                        payload: {
                            walletId: 'wallet-1',
                        },
                    },
                ],
            });

            expectTypeOf(result).toEqualTypeOf<
                SuccessfulOperationResult<
                    {
                        walletId: string;
                    },
                    WalletCreatedEvent
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

        it('does not accept values that are not Events', () => {
            OperationResults.success({
                data: {
                    walletId: 'wallet-1',
                },

                events: [
                    {
                        name: 'wallet.created',
                        // @ts-expect-error result events must implement Event
                        walletId: 'wallet-1',
                    },
                ],
            });
        });
    });

    describe('committedRejection', () => {
        it('creates a committed rejection with reason, data and events', () => {
            const event: WalletCreationRejectedEvent = {
                name: 'wallet.creation-rejected',
                schemaVersion: 1,
                payload: {
                    walletId: 'wallet-1',
                },
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
                events: [
                    {
                        name: 'wallet.creation-rejected',
                        schemaVersion: 1,
                        payload: {
                            walletId: 'wallet-1',
                        },
                    },
                ],
            });

            expectTypeOf(result).toEqualTypeOf<
                CommittedOperationRejection<
                    {
                        code: 'wallet-already-exists';
                    },
                    {
                        walletId: string;
                    },
                    WalletCreationRejectedEvent
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
                        schemaVersion: 1,
                        payload: {
                            attemptId: 'attempt-1',
                        },
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
              BalanceChangedEvent
          >
        | CommittedOperationRejection<
              {
                  code: 'attempt-recorded';
              },
              {
                  attemptId: string;
              },
              BalanceChangeRejectedEvent
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
                    schemaVersion: 1,
                    payload: {
                        previousBalance: 100,
                        currentBalance: 50,
                    },
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
                    schemaVersion: 1,
                    payload: {
                        attemptId: 'attempt-1',
                    },
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

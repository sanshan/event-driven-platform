import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Brand } from '@event-driven-platform/types';

import { type AggregateReference, DefaultAggregateReferenceFactory } from '../index.js';

type WalletId = Brand<string, 'WalletId'>;

describe('AggregateReference', () => {
    it('identifies exactly one Aggregate', () => {
        const reference: AggregateReference<'wallet', WalletId> = {
            type: 'wallet',
            id: 'wallet-1' as WalletId,
        };

        expect(reference).toEqual({
            type: 'wallet',
            id: 'wallet-1',
        });

        expectTypeOf(reference.type).toEqualTypeOf<'wallet'>();

        expectTypeOf(reference.id).toEqualTypeOf<WalletId>();
    });
});

describe('DefaultAggregateReferenceFactory', () => {
    it('creates an immutable AggregateReference', () => {
        const factory = new DefaultAggregateReferenceFactory();

        const reference = factory.create({
            type: 'wallet' as const,
            id: 'wallet-1' as WalletId,
        });

        expect(reference).toEqual({
            type: 'wallet',
            id: 'wallet-1',
        });

        expect(Object.isFrozen(reference)).toBe(true);

        expectTypeOf(reference).toEqualTypeOf<AggregateReference<'wallet', WalletId>>();
    });

    it('rejects an empty type', () => {
        const factory = new DefaultAggregateReferenceFactory();

        expect(() =>
            factory.create({
                type: '',
                id: 'wallet-1' as WalletId,
            }),
        ).toThrow();
    });

    it('rejects an empty identifier', () => {
        const factory = new DefaultAggregateReferenceFactory();

        expect(() =>
            factory.create({
                type: 'wallet',
                id: '' as WalletId,
            }),
        ).toThrow();
    });
});

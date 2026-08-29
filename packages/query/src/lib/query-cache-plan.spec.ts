import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AnyRead, Read } from '@event-driven-platform/read';

import type {
    CacheReadResult,
    CacheReader,
    CacheScope,
    CacheWriter,
    Query,
    QueryCacheLevels,
    QueryCachePlan,
    ReadCacheKey,
} from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

interface OtherView {
    readonly id: string;
    readonly label: string;
}

type GetWalletRead = Read<
    'wallet.get',
    AnyRead['tenant'],
    { readonly walletId: string },
    WalletView
>;
type GetWalletQuery = Query<GetWalletRead>;

describe('QueryCachePlan', () => {
    it('binds a Query cache plan to the associated Read result type', () => {
        type CachePlan = NonNullable<NonNullable<GetWalletQuery['options']>['cache']>;

        expectTypeOf<CachePlan>().toEqualTypeOf<QueryCachePlan<WalletView>>();
    });

    it('preserves declared cache level order and explicit cache identity parts', () => {
        const key: ReadCacheKey = {
            namespace: 'wallet.get',
            version: '1',
            partition: 'tenant:tenant-1',
            value: 'wallet:wallet-1',
        };

        const reader: CacheReader<WalletView> = {
            read: async () => ({ status: 'miss' }),
        };

        const writer: CacheWriter<WalletView> = {
            write: async () => undefined,
        };

        const plan: QueryCachePlan<WalletView> = {
            key,
            levels: [
                {
                    scope: 'local',
                    reader,
                    writer,
                },
                {
                    scope: 'shared',
                    reader,
                },
            ],
        };

        expect(plan.key).toEqual(key);
        expect(plan.levels.map((level) => level.scope)).toEqual(['local', 'shared']);
    });

    it('makes invalid plan and capability combinations unrepresentable by type', () => {
        expectTypeOf<readonly []>().not.toMatchTypeOf<QueryCacheLevels<WalletView>>();
        expectTypeOf<'remote'>().not.toMatchTypeOf<CacheScope>();
        expectTypeOf<CacheReader<OtherView>>().not.toMatchTypeOf<CacheReader<WalletView>>();
        expectTypeOf<CacheWriter<OtherView>>().not.toMatchTypeOf<CacheWriter<WalletView>>();
    });

    it('defines explicit hit, miss and error cache read outcomes', () => {
        type Hit = Extract<CacheReadResult<WalletView>, { readonly status: 'hit' }>;
        type Miss = Extract<CacheReadResult<WalletView>, { readonly status: 'miss' }>;
        type ErrorResult = Extract<CacheReadResult<WalletView>, { readonly status: 'error' }>;

        expectTypeOf<Hit>().toHaveProperty('value').toEqualTypeOf<WalletView>();
        expectTypeOf<Miss>().not.toMatchTypeOf<{ readonly value: unknown }>();
        expectTypeOf<ErrorResult>().toHaveProperty('error').toEqualTypeOf<unknown>();
    });
});

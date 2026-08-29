import { describe, expect, it } from 'vitest';

import type {
    CacheReader,
    CacheWriter,
    Query,
    ReadCacheKey,
    TenantScopedReadCacheKey,
} from '@event-driven-platform/query';
import type { AnyRead, Read } from '@event-driven-platform/read';
import type { ReadHandler } from '@event-driven-platform/read-handler';
import type {
    ReadHandlerResolution,
    ReadHandlerResolver,
} from '@event-driven-platform/read-handler-resolver';

import { DefaultReader } from './reader/default-reader.js';

interface WalletView {
    readonly id: string;
    readonly tenant: string;
}

type GetWalletRead = Read<
    'wallet.get',
    AnyRead['tenant'],
    { readonly walletId: string },
    WalletView
>;

type GetWalletQuery = Query<GetWalletRead>;

const logicalKey: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'wallet',
    value: 'wallet-1',
};

function queryFor(tenantId: string): Omit<GetWalletQuery, 'options'> {
    return {
        read: {
            name: 'wallet.get',
            actor: { type: 'user', id: 'user-1', origin: {} },
            tenant: {
                type: 'merchant',
                id: tenantId as AnyRead['tenant']['id'],
            },
            parameters: { walletId: 'wallet-1' },
        },
        context: { correlationId: `correlation-${tenantId}` },
    };
}

function resolverWith(handler: ReadHandler<GetWalletRead>): ReadHandlerResolver {
    return {
        resolve: <TRead extends AnyRead>(_read: TRead) =>
            ({ status: 'resolved', handlers: [handler] }) as unknown as ReadHandlerResolution<TRead>,
    };
}

function identityOf({ tenant, key }: TenantScopedReadCacheKey): string {
    return JSON.stringify([tenant.type, tenant.id, key.namespace, key.version, key.partition, key.value]);
}

describe('DefaultReader tenant-scoped cache identity', () => {
    it('isolates the same logical cache key across Read tenants', async () => {
        const entries = new Map<string, WalletView>();
        const seenKeys: TenantScopedReadCacheKey[] = [];
        const cache: CacheReader<WalletView> & CacheWriter<WalletView> = {
            read: async (key) => {
                seenKeys.push(key);
                const value = entries.get(identityOf(key));
                return value === undefined ? { status: 'miss' } : { status: 'hit', value };
            },
            write: async (key, value) => {
                seenKeys.push(key);
                entries.set(identityOf(key), value);
            },
        };
        const handler: ReadHandler<GetWalletRead> = {
            execute: async (read) => ({
                id: 'wallet-1',
                tenant: String(read.tenant.id),
            }),
        };
        const reader = new DefaultReader({ readHandlerResolver: resolverWith(handler) });
        const level = { scope: 'local' as const, reader: cache, writer: cache };

        const first = await reader.execute({
            ...queryFor('tenant-a'),
            options: { cache: { key: logicalKey, levels: [level] } },
        });
        const second = await reader.execute({
            ...queryFor('tenant-b'),
            options: { cache: { key: logicalKey, levels: [level] } },
        });

        expect(first.tenant).toBe('tenant-a');
        expect(second.tenant).toBe('tenant-b');
        expect(new Set(seenKeys.map(identityOf)).size).toBe(2);
        expect(seenKeys.every((key) => key.key === logicalKey)).toBe(true);
    });
});

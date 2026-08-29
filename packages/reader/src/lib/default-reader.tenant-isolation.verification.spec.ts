import { describe, expect, it } from 'vitest';

import type {
    ClaimReadExecutionRequest,
    ClaimReadExecutionResult,
    ReadExecutionCoordinator,
    ReleaseReadExecutionRequest,
    ReleaseReadExecutionResult,
    RenewReadExecutionRequest,
    RenewReadExecutionResult,
    WaitForReadExecutionRequest,
    WaitForReadExecutionResult,
} from '@event-driven-platform/read-execution-coordinator';
import type {
    CacheReader,
    CacheWriter,
    Query,
    ReadCacheKey,
    TenantScopedReadCacheKey,
} from '@event-driven-platform/query';
import type { AnyRead, Read } from '@event-driven-platform/read';
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

type GetWalletHandler = {
    readonly execute: (read: GetWalletRead) => Promise<WalletView>;
};

const logicalKey: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'wallets',
    value: 'wallet-1',
};

function identityOf({ tenant, key }: TenantScopedReadCacheKey): string {
    return JSON.stringify([
        tenant.type,
        tenant.id,
        key.namespace,
        key.version,
        key.partition,
        key.value,
    ]);
}

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

function resolverWith(handler: GetWalletHandler): ReadHandlerResolver {
    return {
        resolve: <TRead extends AnyRead>(_read: TRead) =>
            ({ status: 'resolved', handlers: [handler] }) as unknown as ReadHandlerResolution<TRead>,
    };
}

class TestCache implements CacheReader<WalletView>, CacheWriter<WalletView> {
    private readonly entries = new Map<string, WalletView>();

    async read(key: TenantScopedReadCacheKey) {
        const value = this.entries.get(identityOf(key));
        return value === undefined ? ({ status: 'miss' } as const) : ({ status: 'hit', value } as const);
    }

    async write(key: TenantScopedReadCacheKey, value: WalletView): Promise<void> {
        this.entries.set(identityOf(key), value);
    }
}

class TestCoordinator implements ReadExecutionCoordinator {
    readonly claimedIdentities: string[] = [];
    private readonly active = new Map<string, { ownerId: string; version: number }>();
    private version = 0;

    async claim(request: ClaimReadExecutionRequest): Promise<ClaimReadExecutionResult> {
        const identity = identityOf(request.key);
        this.claimedIdentities.push(identity);
        if (this.active.has(identity)) {
            return { status: 'already-in-progress' };
        }

        const lease = { ownerId: request.ownerId, version: ++this.version };
        this.active.set(identity, lease);
        return { status: 'acquired', lease };
    }

    async wait(_request: WaitForReadExecutionRequest): Promise<WaitForReadExecutionResult> {
        return { status: 'released' };
    }

    async renew(request: RenewReadExecutionRequest): Promise<RenewReadExecutionResult> {
        return { status: 'renewed', lease: request.lease };
    }

    async release(request: ReleaseReadExecutionRequest): Promise<ReleaseReadExecutionResult> {
        const identity = identityOf(request.key);
        const current = this.active.get(identity);
        if (
            current === undefined ||
            current.ownerId !== request.lease.ownerId ||
            current.version !== request.lease.version
        ) {
            return { status: 'ownership-lost' };
        }

        this.active.delete(identity);
        return { status: 'released' };
    }
}

function cachedQuery(
    query: Omit<GetWalletQuery, 'options'>,
    local: TestCache,
    shared: TestCache,
): GetWalletQuery {
    return {
        ...query,
        options: {
            cache: {
                key: logicalKey,
                levels: [
                    { scope: 'local', reader: local, writer: local },
                    { scope: 'shared', reader: shared, writer: shared },
                ],
                coordination: { leaseDurationMs: 1_000 },
            },
        },
    };
}

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

describe('DefaultReader tenant isolation verification', () => {
    it('isolates cache, local flight and distributed coordination across tenants', async () => {
        const local = new TestCache();
        const shared = new TestCache();
        const coordinator = new TestCoordinator();
        const bothSourcesStarted = deferred();
        const releaseSources = deferred();
        let sourceExecutions = 0;

        const handler: GetWalletHandler = {
            execute: async (read) => {
                sourceExecutions += 1;
                if (sourceExecutions === 2) {
                    bothSourcesStarted.resolve();
                }
                await releaseSources.promise;
                return { id: 'wallet-1', tenant: String(read.tenant.id) };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith(handler),
            readExecutionCoordinator: coordinator,
            readExecutionOwnerIdFactory: () => `owner-${sourceExecutions + 1}`,
        });

        const first = reader.execute(cachedQuery(queryFor('tenant-a'), local, shared));
        const second = reader.execute(cachedQuery(queryFor('tenant-b'), local, shared));

        await bothSourcesStarted.promise;
        releaseSources.resolve();

        await expect(Promise.all([first, second])).resolves.toEqual([
            { id: 'wallet-1', tenant: 'tenant-a' },
            { id: 'wallet-1', tenant: 'tenant-b' },
        ]);
        expect(sourceExecutions).toBe(2);
        expect(new Set(coordinator.claimedIdentities)).toHaveLength(2);
    });

    it('coalesces the same tenant and reuses its tenant-scoped cache result', async () => {
        const local = new TestCache();
        const shared = new TestCache();
        const coordinator = new TestCoordinator();
        const sourceStarted = deferred();
        const releaseSource = deferred();
        let sourceExecutions = 0;

        const handler: GetWalletHandler = {
            execute: async (read) => {
                sourceExecutions += 1;
                sourceStarted.resolve();
                await releaseSource.promise;
                return { id: 'wallet-1', tenant: String(read.tenant.id) };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith(handler),
            readExecutionCoordinator: coordinator,
            readExecutionOwnerIdFactory: () => 'owner-1',
        });
        const query = cachedQuery(queryFor('tenant-a'), local, shared);

        const first = reader.execute(query);
        const second = reader.execute(query);

        await sourceStarted.promise;
        releaseSource.resolve();

        await expect(Promise.all([first, second])).resolves.toEqual([
            { id: 'wallet-1', tenant: 'tenant-a' },
            { id: 'wallet-1', tenant: 'tenant-a' },
        ]);
        expect(sourceExecutions).toBe(1);
        expect(coordinator.claimedIdentities).toHaveLength(1);

        await expect(reader.execute(query)).resolves.toEqual({
            id: 'wallet-1',
            tenant: 'tenant-a',
        });
        expect(sourceExecutions).toBe(1);
        expect(coordinator.claimedIdentities).toHaveLength(1);
    });
});

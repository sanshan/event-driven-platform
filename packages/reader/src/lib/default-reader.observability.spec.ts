import { describe, expect, it } from 'vitest';

import { FixedClock } from '@event-driven-platform/clock';
import type { ReaderObservation, ReaderObserver } from '@event-driven-platform/observability';
import type { Query, QueryCacheLevel, ReadCacheKey } from '@event-driven-platform/query';
import type { Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader } from './reader/default-reader.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<'wallet.get', { readonly walletId: string }, WalletView>;
type GetWalletQuery = Query<GetWalletRead>;

const read: GetWalletRead = {
    name: 'wallet.get',
    actor: {
        type: 'user',
        id: 'user-1',
        origin: {},
    },
    parameters: { walletId: 'wallet-1' },
};

const key: ReadCacheKey = {
    namespace: 'wallet.get',
    version: '1',
    partition: 'tenant:tenant-1',
    value: 'wallet:wallet-1',
};

const baseQuery: GetWalletQuery = {
    read,
    context: { correlationId: 'correlation-1' },
};

class RecordingReaderObserver implements ReaderObserver {
    readonly observations: ReaderObservation[] = [];

    observe(observation: ReaderObservation): undefined {
        this.observations.push(observation);
        return undefined;
    }
}

function resolverWith(
    resolution: ReadHandlerResolution<GetWalletRead>,
): ReadHandlerResolver {
    return {
        resolve: <TRead extends Read<string, unknown, unknown>>(_read: TRead) =>
            resolution as unknown as ReadHandlerResolution<TRead>,
    };
}

function deferred<TResult>() {
    let resolve!: (value: TResult) => void;
    const promise = new Promise<TResult>((promiseResolve) => {
        resolve = promiseResolve;
    });

    return { promise, resolve };
}

function cachedQuery(level: QueryCacheLevel<WalletView>): GetWalletQuery {
    return {
        ...baseQuery,
        options: {
            cache: {
                key,
                levels: [level],
            },
        },
    };
}

describe('DefaultReader observability', () => {
    it('emits the successful read and source lifecycle with stable read identity', async () => {
        const observer = new RecordingReaderObserver();
        const reader = new DefaultReader({
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer,
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [{ execute: async () => ({ id: 'wallet-1', balance: 10 }) }],
            }),
        });

        await reader.execute(baseQuery);

        expect(observer.observations).toEqual([
            { type: 'read.requested', context: { read: 'wallet.get' } },
            { type: 'read.started', context: { read: 'wallet.get' } },
            {
                type: 'source.completed',
                context: { read: 'wallet.get' },
                outcome: 'success',
                durationMs: 0,
            },
            {
                type: 'read.completed',
                context: { read: 'wallet.get' },
                outcome: 'success',
                durationMs: 0,
            },
        ]);
    });

    it('emits cache lookup, source, and backfill facts on a shared-cache miss', async () => {
        const observer = new RecordingReaderObserver();
        const level: QueryCacheLevel<WalletView> = {
            scope: 'shared',
            reader: { read: async () => ({ status: 'miss' }) },
            writer: { write: async () => undefined },
        };
        const reader = new DefaultReader({
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer,
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [{ execute: async () => ({ id: 'wallet-1', balance: 20 }) }],
            }),
        });

        await reader.execute(cachedQuery(level));

        expect(observer.observations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'cache.lookup.completed',
                    scope: 'shared',
                    level: 0,
                    outcome: 'miss',
                }),
                expect.objectContaining({ type: 'source.completed', outcome: 'success' }),
                expect.objectContaining({
                    type: 'cache.population.completed',
                    scope: 'shared',
                    level: 0,
                    outcome: 'success',
                }),
            ]),
        );
    });

    it('emits local inflight join facts for coalesced callers', async () => {
        const observer = new RecordingReaderObserver();
        const source = deferred<WalletView>();
        const sourceStarted = deferred<void>();
        const level: QueryCacheLevel<WalletView> = {
            scope: 'shared',
            reader: { read: async () => ({ status: 'miss' }) },
        };
        const reader = new DefaultReader({
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer,
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [
                    {
                        execute: async () => {
                            sourceStarted.resolve();
                            return source.promise;
                        },
                    },
                ],
            }),
        });
        const query = cachedQuery(level);

        const first = reader.execute(query);
        await sourceStarted.promise;
        const second = reader.execute(query);

        source.resolve({ id: 'wallet-1', balance: 30 });
        await Promise.all([first, second]);

        expect(observer.observations.filter(({ type }) => type === 'local-inflight.joined')).toHaveLength(1);
        expect(observer.observations.filter(({ type }) => type === 'read.completed')).toHaveLength(2);
    });

    it('classifies timeout and cancellation as bounded read outcomes', async () => {
        const timeoutObserver = new RecordingReaderObserver();
        const timeoutReader = new DefaultReader({
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer: timeoutObserver,
            readTimeout: { execute: async () => ({ type: 'timed-out' }) },
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [{ execute: async () => ({ id: 'wallet-1', balance: 40 }) }],
            }),
        });

        await expect(
            timeoutReader.execute({ ...baseQuery, options: { timeoutMs: 10 } }),
        ).rejects.toThrow();
        expect(timeoutObserver.observations.at(-1)).toEqual(
            expect.objectContaining({ type: 'read.completed', outcome: 'timed-out' }),
        );

        const cancellationObserver = new RecordingReaderObserver();
        const controller = new AbortController();
        controller.abort();
        const cancellationReader = new DefaultReader({
            clock: new FixedClock('2026-08-28T05:00:00.000Z'),
            observer: cancellationObserver,
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        await expect(
            cancellationReader.execute({ ...baseQuery, options: { signal: controller.signal } }),
        ).rejects.toThrow();
        expect(cancellationObserver.observations.at(-1)).toEqual(
            expect.objectContaining({ type: 'read.completed', outcome: 'cancelled' }),
        );
    });

    it('contains observer failures without changing the read result', async () => {
        const observer: ReaderObserver = {
            observe: () => {
                throw new Error('telemetry unavailable');
            },
        };
        const reader = new DefaultReader({
            observer,
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [{ execute: async () => ({ id: 'wallet-1', balance: 50 }) }],
            }),
        });

        await expect(reader.execute(baseQuery)).resolves.toEqual({
            id: 'wallet-1',
            balance: 50,
        });
    });
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import { ExecutionError } from '@event-driven-platform/execution';
import type { Query } from '@event-driven-platform/query';
import type { AnyRead, Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import {
    DefaultReader,
    ReadHandlerAmbiguousError,
    ReadHandlerNotFoundError,
    ReadTimedOutError,
    type ReadTimeout,
    type Reader,
} from '../index.js';

interface WalletView {
    readonly id: string;
    readonly balance: number;
}

type GetWalletRead = Read<
    'wallet.get',
    AnyRead['tenant'],
    { readonly walletId: string },
    WalletView
>;
type GetWalletQuery = Query<GetWalletRead>;

const query: GetWalletQuery = {
    read: {
        name: 'wallet.get',
        actor: {
            type: 'user',
            id: 'user-1',
            origin: {},
        },
        tenant: {
            type: 'merchant',
            id: 'merchant-1' as AnyRead['tenant']['id'],
        },
        parameters: { walletId: 'wallet-1' },
    },
    context: {
        correlationId: 'correlation-1',
    },
};

function resolverWith(
    resolution: ReadHandlerResolution<GetWalletRead>,
): ReadHandlerResolver {
    return {
        resolve: <TRead extends AnyRead>(_read: TRead) =>
            resolution as unknown as ReadHandlerResolution<TRead>,
    };
}

describe('DefaultReader', () => {
    it('executes a no-cache Query through the first resolved handler and preserves result typing', async () => {
        const first = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };
        const second = {
            execute: async () => ({ id: 'wallet-1', balance: 20 }),
        };
        const reader: Reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [first, second],
            }),
        });

        const result = await reader.execute(query);

        expect(result).toEqual({ id: 'wallet-1', balance: 10 });
        expectTypeOf(result).toEqualTypeOf<WalletView>();
    });

    it('fails deterministically when no handler is resolved', async () => {
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'not-found' }),
        });

        const error = await reader.execute(query).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ReadHandlerNotFoundError);
        expect((error as ReadHandlerNotFoundError).executionFailure).toEqual({
            code: 'read-handler-not-found',
            message: 'No ReadHandler is available for the requested Read.',
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    });

    it('fails deterministically when handler resolution is ambiguous', async () => {
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'ambiguous',
                reason: 'multiple incompatible handler sets',
            }),
        });

        await expect(reader.execute(query)).rejects.toEqual(
            new ReadHandlerAmbiguousError('multiple incompatible handler sets'),
        );
    });

    it('applies Query timeout to handler execution', async () => {
        const handler = {
            execute: async () => ({ id: 'wallet-1', balance: 10 }),
        };
        const readTimeout: ReadTimeout = {
            execute: async () => ({ type: 'timed-out' }),
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            readTimeout,
        });
        const timedQuery: GetWalletQuery = {
            ...query,
            options: { timeoutMs: 25 },
        };

        await expect(reader.execute(timedQuery)).rejects.toEqual(new ReadTimedOutError(25));
    });

    it('propagates an already canonical handler failure unchanged', async () => {
        const canonical = new ExecutionError({
            code: 'read-provider-unavailable',
            message: 'Read provider is unavailable.',
            classification: 'unavailable',
            retry: 'caller',
            retryable: false,
        });
        const handler = {
            execute: async () => {
                throw canonical;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        const error = await reader.execute(query).catch((caught: unknown) => caught);

        expect(error).toBe(canonical);
    });

    it('normalizes an unknown handler failure and preserves its Error cause', async () => {
        const cause = new Error('database connection failed');
        const handler = {
            execute: async () => {
                throw cause;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        const error = await reader.execute(query).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).cause).toBe(cause);
        expect((error as ExecutionError).executionFailure).toEqual({
            code: 'unexpected-execution-error',
            message: 'An unexpected execution error occurred.',
            classification: 'internal',
            retry: 'never',
            retryable: false,
        });
    });
});

import { describe, expect, it } from 'vitest';

import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { Query, ReadCacheKey } from '@event-driven-platform/query';
import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type { AnyRead, Read } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReader, ReadExecutionCoordinatorFailedError } from '../index.js';
import type { RetryDelay } from './retry/retry-delay.js';

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
type RetryOptions = NonNullable<GetWalletQuery['options']>['retry'];

class RecordingRetryDelay implements RetryDelay {
    readonly delays: number[] = [];

    async wait(delayMs: number): Promise<void> {
        this.delays.push(delayMs);
    }
}

function retryableError(code = 'source-unavailable') {
    return new ExecutionFailureError({
        code,
        message: 'Source unavailable.',
        retryable: true,
    });
}

function nonRetryableError() {
    return new ExecutionFailureError({
        code: 'invalid-source-response',
        message: 'Source response is invalid.',
        retryable: false,
    });
}

function resolverWith(
    resolution: ReadHandlerResolution<GetWalletRead>,
): ReadHandlerResolver {
    return {
        resolve: <TRead extends AnyRead>(_read: TRead) =>
            resolution as unknown as ReadHandlerResolution<TRead>,
    };
}

function baseQuery(retry: RetryOptions | undefined): GetWalletQuery {
    return {
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
        options: { retry },
    };
}

function cachedQuery(retry: RetryOptions | undefined): GetWalletQuery {
    const key: ReadCacheKey = {
        namespace: 'wallet.get',
        version: '1',
        partition: 'tenant:tenant-1',
        value: 'wallet:wallet-1',
    };

    const query = baseQuery(retry);
    return {
        ...query,
        options: {
            ...query.options,
            cache: {
                key,
                levels: [{ scope: 'local', reader: { read: async () => ({ status: 'miss' }) } }],
            },
        },
    };
}

describe('DefaultReader retry orchestration', () => {
    it('succeeds after a retryable failure on the uncached path', async () => {
        let calls = 0;
        const handler = {
            execute: async () => {
                calls += 1;
                if (calls === 1) {
                    throw retryableError();
                }

                return { id: 'wallet-1', balance: 10 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay: new RecordingRetryDelay(),
        });

        const result = await reader.execute(baseQuery({ maxAttempts: 2 }));

        expect(result).toEqual({ id: 'wallet-1', balance: 10 });
        expect(calls).toBe(2);
    });

    it('succeeds after a retryable failure on the cache-miss path', async () => {
        let calls = 0;
        const handler = {
            execute: async () => {
                calls += 1;
                if (calls === 1) {
                    throw retryableError();
                }

                return { id: 'wallet-1', balance: 20 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay: new RecordingRetryDelay(),
        });

        const result = await reader.execute(cachedQuery({ maxAttempts: 2 }));

        expect(result).toEqual({ id: 'wallet-1', balance: 20 });
        expect(calls).toBe(2);
    });

    it('stops when the maxAttempts budget is exhausted', async () => {
        let calls = 0;
        const firstError = retryableError('first');
        const secondError = retryableError('second');
        const handler = {
            execute: async () => {
                calls += 1;
                throw calls === 1 ? firstError : secondError;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay: new RecordingRetryDelay(),
        });

        await expect(
            reader.execute(baseQuery({ maxAttempts: 2 })),
        ).rejects.toBe(secondError);
        expect(calls).toBe(2);
    });

    it('does not retry a non-retryable failure', async () => {
        let calls = 0;
        const errorValue = nonRetryableError();
        const handler = {
            execute: async () => {
                calls += 1;
                throw errorValue;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay: new RecordingRetryDelay(),
        });

        await expect(
            reader.execute(baseQuery({ maxAttempts: 3 })),
        ).rejects.toBe(errorValue);
        expect(calls).toBe(1);
    });

    it('does not retry when no retry option is configured (unchanged default behavior)', async () => {
        let calls = 0;
        const errorValue = retryableError();
        const handler = {
            execute: async () => {
                calls += 1;
                throw errorValue;
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
        });

        await expect(
            reader.execute(baseQuery(undefined)),
        ).rejects.toBe(errorValue);
        expect(calls).toBe(1);
    });

    it('uses the configured fixed delay before the next attempt', async () => {
        const retryDelay = new RecordingRetryDelay();
        let calls = 0;
        const handler = {
            execute: async () => {
                calls += 1;
                if (calls === 1) {
                    throw retryableError();
                }

                return { id: 'wallet-1', balance: 30 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay,
        });

        await reader.execute(
            baseQuery({ maxAttempts: 2, strategy: { type: 'fixed', delayMs: 75 } }),
        );

        expect(retryDelay.delays).toEqual([75]);
    });

    it('shares one retry sequence across concurrent callers collapsed by single-flight', async () => {
        let calls = 0;
        const handler = {
            execute: async () => {
                calls += 1;
                if (calls === 1) {
                    throw retryableError();
                }

                return { id: 'wallet-1', balance: 40 };
            },
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({ status: 'resolved', handlers: [handler] }),
            retryDelay: new RecordingRetryDelay(),
        });
        const query = cachedQuery({ maxAttempts: 2 });

        const requests = Array.from({ length: 10 }, () => reader.execute(query));
        const results = await Promise.all(requests);

        expect(results).toEqual(Array.from({ length: 10 }, () => ({ id: 'wallet-1', balance: 40 })));
        expect(calls).toBe(2);
    });

    it('never retries a coordinator failure, even with retry configured', async () => {
        let sourceCalls = 0;
        let claimCalls = 0;
        const unavailableCoordinator: ReadExecutionCoordinator = {
            claim: async () => {
                claimCalls += 1;
                return { status: 'unavailable', reason: 'coordinator unavailable' };
            },
            wait: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
            renew: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
            release: async () => ({ status: 'unavailable', reason: 'coordinator unavailable' }),
        };
        const reader = new DefaultReader({
            readHandlerResolver: resolverWith({
                status: 'resolved',
                handlers: [
                    {
                        execute: async () => {
                            sourceCalls += 1;
                            return { id: 'wallet-1', balance: 50 };
                        },
                    },
                ],
            }),
            readExecutionCoordinator: unavailableCoordinator,
            retryDelay: new RecordingRetryDelay(),
        });
        const key: ReadCacheKey = {
            namespace: 'wallet.get',
            version: '1',
            partition: 'tenant:tenant-1',
            value: 'wallet:wallet-1',
        };
        const query: GetWalletQuery = {
            ...baseQuery({ maxAttempts: 5 }),
            options: {
                retry: { maxAttempts: 5 },
                cache: {
                    key,
                    coordination: { leaseDurationMs: 1_000 },
                    levels: [
                        { scope: 'local', reader: { read: async () => ({ status: 'miss' }) } },
                        { scope: 'shared', reader: { read: async () => ({ status: 'miss' }) } },
                    ],
                },
            },
        };

        await expect(reader.execute(query)).rejects.toEqual(
            new ReadExecutionCoordinatorFailedError('unavailable', 'coordinator unavailable'),
        );
        expect(claimCalls).toBe(1);
        expect(sourceCalls).toBe(0);
    });
});

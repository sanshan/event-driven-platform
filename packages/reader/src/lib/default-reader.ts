import { randomUUID } from 'node:crypto';

import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type { Query, QueryCacheLevel, QueryCachePlan, ReadCacheKey } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReadTimeout } from './default-read-timeout.js';
import { DistributedReadFlight } from './distributed-read-flight.js';
import { LocalReadInFlight } from './local-read-in-flight.js';
import { ReadCancelledError } from './read-cancelled.error.js';
import { ReadExecutionCoordinationNotConfiguredError } from './read-execution-coordination-not-configured.error.js';
import { ReadHandlerAmbiguousError } from './read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from './read-handler-not-found.error.js';
import { ReadTimedOutError } from './read-timed-out.error.js';
import type { ReadTimeout } from './read-timeout.js';
import type { Reader } from './reader.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
    readonly readExecutionCoordinator?: ReadExecutionCoordinator;
    readonly readExecutionOwnerIdFactory?: () => string;
}

interface CacheHit<TResult> {
    readonly index: number;
    readonly value: TResult;
}

type SharedCacheResult<TResult> =
    | { readonly status: 'hit'; readonly value: TResult }
    | { readonly status: 'miss' };

export class DefaultReader implements Reader {
    private readonly readTimeout: ReadTimeout;
    private readonly localReadInFlight = new LocalReadInFlight();
    private readonly ownerIdFactory: () => string;

    constructor(private readonly dependencies: DefaultReaderDependencies) {
        this.readTimeout = dependencies.readTimeout ?? new DefaultReadTimeout();
        this.ownerIdFactory = dependencies.readExecutionOwnerIdFactory ?? randomUUID;
    }

    async execute<TRead extends AnyRead>(query: Query<TRead>): Promise<ReadResultOf<TRead>> {
        if (query.options?.signal?.aborted === true) {
            throw new ReadCancelledError();
        }

        const cachePlan = query.options?.cache;

        if (cachePlan === undefined) {
            return this.executeSource(query);
        }

        return this.awaitWithQueryControls(
            this.executeCached(query, cachePlan),
            query.options?.timeoutMs,
            query.options?.signal,
        );
    }

    private async executeCached<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
    ): Promise<ReadResultOf<TRead>> {
        const firstSharedIndex = cachePlan.levels.findIndex((level) => level.scope === 'shared');
        const localEndIndex = firstSharedIndex === -1 ? cachePlan.levels.length : firstSharedIndex;
        const localHit = await this.findCacheHit(
            cachePlan.levels.slice(0, localEndIndex),
            cachePlan.key,
        );

        if (localHit !== undefined) {
            await this.populateLevels(
                cachePlan.levels.slice(0, localHit.index),
                cachePlan.key,
                localHit.value,
            );

            return localHit.value;
        }

        return this.localReadInFlight.run(cachePlan.key, () =>
            this.executeLocalLeader(query, cachePlan, localEndIndex),
        );
    }

    private async executeLocalLeader<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
        localEndIndex: number,
    ): Promise<ReadResultOf<TRead>> {
        const localHit = await this.findCacheHit(
            cachePlan.levels.slice(0, localEndIndex),
            cachePlan.key,
        );

        if (localHit !== undefined) {
            await this.populateLevels(
                cachePlan.levels.slice(0, localHit.index),
                cachePlan.key,
                localHit.value,
            );

            return localHit.value;
        }

        const downstreamResult = await this.findSharedCacheResult(cachePlan, localEndIndex);

        if (downstreamResult.status === 'hit') {
            return downstreamResult.value;
        }

        const coordination = cachePlan.coordination;
        if (coordination === undefined) {
            return this.executeSourceAndBackfill(query, cachePlan);
        }

        if (localEndIndex === cachePlan.levels.length) {
            throw new ReadExecutionCoordinationNotConfiguredError(
                'a shared cache level is required as the distributed rendezvous point',
            );
        }

        if (!Number.isFinite(coordination.leaseDurationMs) || coordination.leaseDurationMs <= 0) {
            throw new ReadExecutionCoordinationNotConfiguredError(
                'leaseDurationMs must be a positive finite number',
            );
        }

        const coordinator = this.dependencies.readExecutionCoordinator;
        if (coordinator === undefined) {
            throw new ReadExecutionCoordinationNotConfiguredError(
                'ReadExecutionCoordinator dependency is required when coordination is enabled',
            );
        }

        const distributedFlight = new DistributedReadFlight(coordinator);

        return distributedFlight.run({
            key: cachePlan.key,
            ownerId: this.ownerIdFactory(),
            leaseDurationMs: coordination.leaseDurationMs,
            readShared: () => this.findSharedCacheResult(cachePlan, localEndIndex),
            executeSource: () => this.executeSourceWithoutTimeout(query),
            publishSourceResult: (result) =>
                this.populateLevels(cachePlan.levels, cachePlan.key, result),
        });
    }

    private async findSharedCacheResult<TResult>(
        cachePlan: QueryCachePlan<TResult>,
        firstSharedIndex: number,
    ): Promise<SharedCacheResult<TResult>> {
        const hit = await this.findCacheHit(
            cachePlan.levels.slice(firstSharedIndex),
            cachePlan.key,
            firstSharedIndex,
        );

        if (hit === undefined) {
            return { status: 'miss' };
        }

        await this.populateLevels(
            cachePlan.levels.slice(0, hit.index),
            cachePlan.key,
            hit.value,
        );

        return { status: 'hit', value: hit.value };
    }

    private async executeSourceAndBackfill<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
    ): Promise<ReadResultOf<TRead>> {
        const sourceResult = await this.executeSourceWithoutTimeout(query);

        await this.populateLevels(cachePlan.levels, cachePlan.key, sourceResult);

        return sourceResult;
    }

    private async findCacheHit<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: ReadCacheKey,
        offset = 0,
    ): Promise<CacheHit<TResult> | undefined> {
        for (const [index, level] of levels.entries()) {
            const cacheResult = await this.readCacheLevel(level, key);

            if (cacheResult?.status === 'hit') {
                return {
                    index: offset + index,
                    value: cacheResult.value,
                };
            }
        }

        return undefined;
    }

    private async readCacheLevel<TResult>(level: QueryCacheLevel<TResult>, key: ReadCacheKey) {
        try {
            return await level.reader.read(key);
        } catch {
            return undefined;
        }
    }

    private async populateLevels<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: ReadCacheKey,
        value: TResult,
    ): Promise<void> {
        for (const level of [...levels].reverse()) {
            const writer = level.writer;

            if (writer === undefined) {
                continue;
            }

            try {
                await writer.write(key, value);
            } catch {
                // Cache population is an optimization and must not replace a successful read result.
            }
        }
    }

    private async executeSource<TRead extends AnyRead>(
        query: Query<TRead>,
    ): Promise<ReadResultOf<TRead>> {
        const work = this.resolveSourceWork(query);
        const timeoutMs = query.options?.timeoutMs;
        const signal = query.options?.signal;

        if (timeoutMs === undefined) {
            return this.awaitWithCancellation(work(), signal);
        }

        const timedExecution = await this.awaitWithCancellation(
            this.readTimeout.execute(work, timeoutMs),
            signal,
        );

        if (timedExecution.type === 'timed-out') {
            throw new ReadTimedOutError(timeoutMs);
        }

        return timedExecution.result;
    }

    private executeSourceWithoutTimeout<TRead extends AnyRead>(
        query: Query<TRead>,
    ): Promise<ReadResultOf<TRead>> {
        return this.resolveSourceWork(query)();
    }

    private resolveSourceWork<TRead extends AnyRead>(
        query: Query<TRead>,
    ): () => Promise<ReadResultOf<TRead>> {
        const resolution = this.dependencies.readHandlerResolver.resolve(query.read);
        const handler = this.resolveHandler(resolution);

        return () => handler.execute(query.read);
    }

    private async awaitWithQueryControls<TResult>(
        work: Promise<TResult>,
        timeoutMs: number | undefined,
        signal: AbortSignal | undefined,
    ): Promise<TResult> {
        if (timeoutMs === undefined) {
            return this.awaitWithCancellation(work, signal);
        }

        const timedExecution = await this.awaitWithCancellation(
            this.readTimeout.execute(() => work, timeoutMs),
            signal,
        );

        if (timedExecution.type === 'timed-out') {
            throw new ReadTimedOutError(timeoutMs);
        }

        return timedExecution.result;
    }

    private async awaitWithCancellation<TResult>(
        work: Promise<TResult>,
        signal: AbortSignal | undefined,
    ): Promise<TResult> {
        if (signal === undefined) {
            return work;
        }

        if (signal.aborted) {
            throw new ReadCancelledError();
        }

        return new Promise<TResult>((resolve, reject) => {
            const onAbort = (): void => {
                reject(new ReadCancelledError());
            };

            signal.addEventListener('abort', onAbort, { once: true });

            void work.then(
                (result) => {
                    signal.removeEventListener('abort', onAbort);
                    resolve(result);
                },
                (error: unknown) => {
                    signal.removeEventListener('abort', onAbort);
                    reject(error);
                },
            );
        });
    }

    private resolveHandler<TRead extends AnyRead>(resolution: ReadHandlerResolution<TRead>) {
        switch (resolution.status) {
            case 'resolved':
                return resolution.handlers[0];
            case 'not-found':
                throw new ReadHandlerNotFoundError();
            case 'ambiguous':
                throw new ReadHandlerAmbiguousError(resolution.reason);
        }
    }
}

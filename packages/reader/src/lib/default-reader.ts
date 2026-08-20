import type { Query, QueryCacheLevel, QueryCachePlan, ReadCacheKey } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReadTimeout } from './default-read-timeout.js';
import { LocalReadInFlight } from './local-read-in-flight.js';
import { ReadHandlerAmbiguousError } from './read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from './read-handler-not-found.error.js';
import { ReadTimedOutError } from './read-timed-out.error.js';
import type { ReadTimeout } from './read-timeout.js';
import type { Reader } from './reader.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
}

interface CacheHit<TResult> {
    readonly index: number;
    readonly value: TResult;
}

export class DefaultReader implements Reader {
    private readonly readTimeout: ReadTimeout;
    private readonly localReadInFlight = new LocalReadInFlight();

    constructor(private readonly dependencies: DefaultReaderDependencies) {
        this.readTimeout = dependencies.readTimeout ?? new DefaultReadTimeout();
    }

    async execute<TRead extends AnyRead>(query: Query<TRead>): Promise<ReadResultOf<TRead>> {
        const cachePlan = query.options?.cache;

        if (cachePlan === undefined) {
            return this.executeSource(query);
        }

        return this.executeCached(query, cachePlan);
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

        const flight = this.localReadInFlight.run(cachePlan.key, () =>
            this.executeLocalLeader(query, cachePlan, localEndIndex),
        );

        return this.awaitWithQueryTimeout(flight, query.options?.timeoutMs);
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

        const downstreamHit = await this.findCacheHit(
            cachePlan.levels.slice(localEndIndex),
            cachePlan.key,
            localEndIndex,
        );

        if (downstreamHit !== undefined) {
            await this.populateLevels(
                cachePlan.levels.slice(0, downstreamHit.index),
                cachePlan.key,
                downstreamHit.value,
            );

            return downstreamHit.value;
        }

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
        return this.awaitWithQueryTimeout(
            this.executeSourceWithoutTimeout(query),
            query.options?.timeoutMs,
        );
    }

    private async executeSourceWithoutTimeout<TRead extends AnyRead>(
        query: Query<TRead>,
    ): Promise<ReadResultOf<TRead>> {
        const resolution = this.dependencies.readHandlerResolver.resolve(query.read);
        const handler = this.resolveHandler(resolution);

        return handler.execute(query.read);
    }

    private async awaitWithQueryTimeout<TResult>(
        work: Promise<TResult>,
        timeoutMs: number | undefined,
    ): Promise<TResult> {
        if (timeoutMs === undefined) {
            return work;
        }

        const timedExecution = await this.readTimeout.execute(() => work, timeoutMs);

        if (timedExecution.type === 'timed-out') {
            throw new ReadTimedOutError(timeoutMs);
        }

        return timedExecution.result;
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

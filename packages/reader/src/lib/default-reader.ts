import type { Query, QueryCacheLevel, QueryCachePlan, ReadCacheKey } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { DefaultReadTimeout } from './default-read-timeout.js';
import { ReadHandlerAmbiguousError } from './read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from './read-handler-not-found.error.js';
import { ReadTimedOutError } from './read-timed-out.error.js';
import type { ReadTimeout } from './read-timeout.js';
import type { Reader } from './reader.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
}

export class DefaultReader implements Reader {
    private readonly readTimeout: ReadTimeout;

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
        for (const [index, level] of cachePlan.levels.entries()) {
            const cacheResult = await this.readCacheLevel(level, cachePlan.key);

            if (cacheResult?.status !== 'hit') {
                continue;
            }

            await this.populateLevels(
                cachePlan.levels.slice(0, index),
                cachePlan.key,
                cacheResult.value,
            );

            return cacheResult.value;
        }

        const sourceResult = await this.executeSource(query);

        await this.populateLevels(cachePlan.levels, cachePlan.key, sourceResult);

        return sourceResult;
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
        for (const level of levels.toReversed()) {
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
        const resolution = this.dependencies.readHandlerResolver.resolve(query.read);
        const handler = this.resolveHandler(resolution);
        const timeoutMs = query.options?.timeoutMs;

        if (timeoutMs === undefined) {
            return handler.execute(query.read);
        }

        const timedExecution = await this.readTimeout.execute(
            () => handler.execute(query.read),
            timeoutMs,
        );

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

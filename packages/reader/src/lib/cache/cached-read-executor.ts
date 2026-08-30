import type { Clock } from '@event-driven-platform/clock';
import type { ReaderObservationContext, ReaderObserver } from '@event-driven-platform/observability';
import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type {
    Query,
    QueryCachePlan,
    TenantScopedReadCacheKey,
} from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

import { ReadExecutionCoordinationNotConfiguredError } from '../errors/read-execution-coordination-not-configured.error.js';
import { DistributedReadFlight } from '../inflight/distributed-read-flight.js';
import { LocalReadInFlight } from '../inflight/local-read-in-flight.js';
import { executeReadWithRetry } from '../retry/execute-read-with-retry.js';
import type { RetryDelay } from '../retry/retry-delay.js';
import type { ReadSourceExecutor } from '../source/read-source-executor.js';
import { ReadCacheTraversal } from './read-cache-traversal.js';

export interface CachedReadExecutorDependencies {
    readonly sourceExecutor: ReadSourceExecutor;
    readonly readExecutionCoordinator?: ReadExecutionCoordinator;
    readonly ownerIdFactory: () => string;
    readonly clock: Clock;
    readonly observer: ReaderObserver;
    readonly retryDelay: RetryDelay;
}

type SharedCacheResult<TResult> =
    | { readonly status: 'hit'; readonly value: TResult }
    | { readonly status: 'miss' };

export class CachedReadExecutor {
    private readonly localReadInFlight = new LocalReadInFlight();
    private readonly cacheTraversal: ReadCacheTraversal;

    public constructor(private readonly dependencies: CachedReadExecutorDependencies) {
        this.cacheTraversal = new ReadCacheTraversal({
            clock: dependencies.clock,
            observer: dependencies.observer,
        });
    }

    public async execute<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
        context: ReaderObservationContext,
    ): Promise<ReadResultOf<TRead>> {
        const scopedKey: TenantScopedReadCacheKey = {
            tenant: query.read.tenant,
            key: cachePlan.key,
        };
        const firstSharedIndex = cachePlan.levels.findIndex((level) => level.scope === 'shared');
        const localEndIndex = firstSharedIndex === -1 ? cachePlan.levels.length : firstSharedIndex;
        const localHit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(0, localEndIndex),
            scopedKey,
            context,
        );

        if (localHit !== undefined) {
            await this.cacheTraversal.populate(
                cachePlan.levels.slice(0, localHit.index),
                scopedKey,
                localHit.value,
                context,
            );
            return localHit.value;
        }

        return this.localReadInFlight.run(
            scopedKey,
            () => this.executeLocalLeader(query, cachePlan, scopedKey, localEndIndex, context),
            () => {
                this.dependencies.observer.observe({ type: 'local-inflight.joined', context });
            },
        );
    }

    private async executeLocalLeader<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
        scopedKey: TenantScopedReadCacheKey,
        localEndIndex: number,
        context: ReaderObservationContext,
    ): Promise<ReadResultOf<TRead>> {
        const localHit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(0, localEndIndex),
            scopedKey,
            context,
        );

        if (localHit !== undefined) {
            await this.cacheTraversal.populate(
                cachePlan.levels.slice(0, localHit.index),
                scopedKey,
                localHit.value,
                context,
            );
            return localHit.value;
        }

        const shared = await this.findSharedCacheResult(cachePlan, scopedKey, localEndIndex, context);
        if (shared.status === 'hit') {
            return shared.value;
        }

        if (cachePlan.coordination === undefined) {
            return this.executeSourceAndBackfill(query, cachePlan, scopedKey, context);
        }

        if (localEndIndex === cachePlan.levels.length) {
            throw new ReadExecutionCoordinationNotConfiguredError(
                'a shared cache level is required as the distributed rendezvous point',
            );
        }

        if (
            !Number.isFinite(cachePlan.coordination.leaseDurationMs) ||
            cachePlan.coordination.leaseDurationMs <= 0
        ) {
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

        return new DistributedReadFlight({
            coordinator,
            clock: this.dependencies.clock,
            observer: this.dependencies.observer,
            context,
        }).run({
            key: scopedKey,
            ownerId: this.dependencies.ownerIdFactory(),
            leaseDurationMs: cachePlan.coordination.leaseDurationMs,
            readShared: () => this.findSharedCacheResult(cachePlan, scopedKey, localEndIndex, context),
            // Retry wraps only this source call, not the surrounding distributed-flight
            // machinery (claim/wait/lease-renewal) — those failures (e.g. ownership-lost)
            // already have their own recovery path and must not be double-retried here.
            executeSource: () =>
                executeReadWithRetry(
                    () => this.dependencies.sourceExecutor.execute(query.read, context),
                    query.options?.retry,
                    this.dependencies.retryDelay,
                ),
            publishSourceResult: (result) =>
                this.cacheTraversal.populate(cachePlan.levels, scopedKey, result, context),
        });
    }

    private async findSharedCacheResult<TResult>(
        cachePlan: QueryCachePlan<TResult>,
        scopedKey: TenantScopedReadCacheKey,
        firstSharedIndex: number,
        context: ReaderObservationContext,
    ): Promise<SharedCacheResult<TResult>> {
        const hit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(firstSharedIndex),
            scopedKey,
            context,
            firstSharedIndex,
        );

        if (hit === undefined) {
            return { status: 'miss' };
        }

        await this.cacheTraversal.populate(
            cachePlan.levels.slice(0, hit.index),
            scopedKey,
            hit.value,
            context,
        );

        return { status: 'hit', value: hit.value };
    }

    private async executeSourceAndBackfill<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
        scopedKey: TenantScopedReadCacheKey,
        context: ReaderObservationContext,
    ): Promise<ReadResultOf<TRead>> {
        const sourceResult = await executeReadWithRetry(
            () => this.dependencies.sourceExecutor.execute(query.read, context),
            query.options?.retry,
            this.dependencies.retryDelay,
        );
        await this.cacheTraversal.populate(cachePlan.levels, scopedKey, sourceResult, context);
        return sourceResult;
    }
}

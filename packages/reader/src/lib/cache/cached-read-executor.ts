import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type { Query, QueryCachePlan } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

import { DistributedReadFlight } from '../distributed-read-flight.js';
import { LocalReadInFlight } from '../local-read-in-flight.js';
import { ReadExecutionCoordinationNotConfiguredError } from '../read-execution-coordination-not-configured.error.js';
import type { ReadSourceExecutor } from '../source/read-source-executor.js';
import { ReadCacheTraversal } from './read-cache-traversal.js';

export interface CachedReadExecutorDependencies {
    readonly sourceExecutor: ReadSourceExecutor;
    readonly readExecutionCoordinator?: ReadExecutionCoordinator;
    readonly ownerIdFactory: () => string;
}

type SharedCacheResult<TResult> =
    | { readonly status: 'hit'; readonly value: TResult }
    | { readonly status: 'miss' };

export class CachedReadExecutor {
    private readonly localReadInFlight = new LocalReadInFlight();
    private readonly cacheTraversal = new ReadCacheTraversal();

    public constructor(private readonly dependencies: CachedReadExecutorDependencies) {}

    public async execute<TRead extends AnyRead>(
        query: Query<TRead>,
        cachePlan: QueryCachePlan<ReadResultOf<TRead>>,
    ): Promise<ReadResultOf<TRead>> {
        const firstSharedIndex = cachePlan.levels.findIndex((level) => level.scope === 'shared');
        const localEndIndex = firstSharedIndex === -1 ? cachePlan.levels.length : firstSharedIndex;
        const localHit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(0, localEndIndex),
            cachePlan.key,
        );

        if (localHit !== undefined) {
            await this.cacheTraversal.populate(
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
        const localHit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(0, localEndIndex),
            cachePlan.key,
        );

        if (localHit !== undefined) {
            await this.cacheTraversal.populate(
                cachePlan.levels.slice(0, localHit.index),
                cachePlan.key,
                localHit.value,
            );
            return localHit.value;
        }

        const shared = await this.findSharedCacheResult(cachePlan, localEndIndex);
        if (shared.status === 'hit') {
            return shared.value;
        }

        if (cachePlan.coordination === undefined) {
            return this.executeSourceAndBackfill(query, cachePlan);
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

        return new DistributedReadFlight(coordinator).run({
            key: cachePlan.key,
            ownerId: this.dependencies.ownerIdFactory(),
            leaseDurationMs: cachePlan.coordination.leaseDurationMs,
            readShared: () => this.findSharedCacheResult(cachePlan, localEndIndex),
            executeSource: () => this.dependencies.sourceExecutor.execute(query.read),
            publishSourceResult: (result) =>
                this.cacheTraversal.populate(cachePlan.levels, cachePlan.key, result),
        });
    }

    private async findSharedCacheResult<TResult>(
        cachePlan: QueryCachePlan<TResult>,
        firstSharedIndex: number,
    ): Promise<SharedCacheResult<TResult>> {
        const hit = await this.cacheTraversal.findHit(
            cachePlan.levels.slice(firstSharedIndex),
            cachePlan.key,
            firstSharedIndex,
        );

        if (hit === undefined) {
            return { status: 'miss' };
        }

        await this.cacheTraversal.populate(
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
        const sourceResult = await this.dependencies.sourceExecutor.execute(query.read);
        await this.cacheTraversal.populate(cachePlan.levels, cachePlan.key, sourceResult);
        return sourceResult;
    }
}

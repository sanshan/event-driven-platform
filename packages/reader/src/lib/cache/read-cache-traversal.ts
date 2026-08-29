import type { Clock } from '@event-driven-platform/clock';
import type { ReaderObservationContext, ReaderObserver } from '@event-driven-platform/observability';
import type { QueryCacheLevel, TenantScopedReadCacheKey } from '@event-driven-platform/query';

export interface ReadCacheHit<TResult> {
    readonly index: number;
    readonly value: TResult;
}

export interface ReadCacheTraversalDependencies {
    readonly clock: Clock;
    readonly observer: ReaderObserver;
}

export class ReadCacheTraversal {
    public constructor(private readonly dependencies: ReadCacheTraversalDependencies) {}

    public async findHit<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: TenantScopedReadCacheKey,
        context: ReaderObservationContext,
        offset = 0,
    ): Promise<ReadCacheHit<TResult> | undefined> {
        for (const [index, level] of levels.entries()) {
            const startedAt = this.dependencies.clock.now();

            try {
                const result = await level.reader.read(key);

                this.dependencies.observer.observe({
                    type: 'cache.lookup.completed',
                    context,
                    scope: level.scope,
                    level: offset + index,
                    outcome: result.status,
                    durationMs: this.durationSince(startedAt),
                });

                if (result.status === 'hit') {
                    return { index: offset + index, value: result.value };
                }
            } catch {
                this.dependencies.observer.observe({
                    type: 'cache.lookup.completed',
                    context,
                    scope: level.scope,
                    level: offset + index,
                    outcome: 'error',
                    durationMs: this.durationSince(startedAt),
                });
                // Cache read failure degrades to a miss for traversal purposes.
            }
        }

        return undefined;
    }

    public async populate<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: TenantScopedReadCacheKey,
        value: TResult,
        context: ReaderObservationContext,
        offset = 0,
    ): Promise<void> {
        const indexedLevels = levels.map((level, index) => ({ level, index: offset + index }));

        for (const { level, index } of indexedLevels.reverse()) {
            if (level.writer === undefined) {
                continue;
            }

            const startedAt = this.dependencies.clock.now();

            try {
                await level.writer.write(key, value);
                this.dependencies.observer.observe({
                    type: 'cache.population.completed',
                    context,
                    scope: level.scope,
                    level: index,
                    outcome: 'success',
                    durationMs: this.durationSince(startedAt),
                });
            } catch {
                this.dependencies.observer.observe({
                    type: 'cache.population.completed',
                    context,
                    scope: level.scope,
                    level: index,
                    outcome: 'error',
                    durationMs: this.durationSince(startedAt),
                });
                // Cache population must never replace a successful read result.
            }
        }
    }

    private durationSince(startedAt: string): number {
        return Math.max(
            0,
            Date.parse(this.dependencies.clock.now()) - Date.parse(startedAt),
        );
    }
}

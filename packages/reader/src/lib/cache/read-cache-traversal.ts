import type { QueryCacheLevel, ReadCacheKey } from '@event-driven-platform/query';

export interface ReadCacheHit<TResult> {
    readonly index: number;
    readonly value: TResult;
}

export class ReadCacheTraversal {
    public async findHit<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: ReadCacheKey,
        offset = 0,
    ): Promise<ReadCacheHit<TResult> | undefined> {
        for (const [index, level] of levels.entries()) {
            try {
                const result = await level.reader.read(key);
                if (result.status === 'hit') {
                    return { index: offset + index, value: result.value };
                }
            } catch {
                // Cache read failure degrades to a miss for traversal purposes.
            }
        }

        return undefined;
    }

    public async populate<TResult>(
        levels: readonly QueryCacheLevel<TResult>[],
        key: ReadCacheKey,
        value: TResult,
    ): Promise<void> {
        for (const level of [...levels].reverse()) {
            if (level.writer === undefined) {
                continue;
            }

            try {
                await level.writer.write(key, value);
            } catch {
                // Cache population must never replace a successful read result.
            }
        }
    }
}

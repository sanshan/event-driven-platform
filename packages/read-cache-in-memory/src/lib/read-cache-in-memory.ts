import type { CacheReadResult, CacheReader, CacheWriter, ReadCacheKey } from '@event-driven-platform/query';

export interface InMemoryReadCacheOptions {
    readonly capacity: number;
    readonly ttlMs: number;
    readonly now?: () => number;
}

interface InMemoryReadCacheEntry<TResult> {
    readonly value: TResult;
    readonly expiresAt: number;
}

export class InMemoryReadCache<TResult> implements CacheReader<TResult>, CacheWriter<TResult> {
    private readonly entries = new Map<string, InMemoryReadCacheEntry<TResult>>();
    private readonly now: () => number;

    public constructor(private readonly options: InMemoryReadCacheOptions) {
        if (!Number.isInteger(options.capacity) || options.capacity <= 0) {
            throw new RangeError('InMemory read cache capacity must be a positive integer.');
        }

        if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0) {
            throw new RangeError('InMemory read cache ttlMs must be greater than zero.');
        }

        this.now = options.now ?? Date.now;
    }

    public async read(key: ReadCacheKey): Promise<CacheReadResult<TResult>> {
        const identity = encodeReadCacheKey(key);
        const entry = this.entries.get(identity);

        if (entry === undefined) {
            return { status: 'miss' };
        }

        if (entry.expiresAt <= this.now()) {
            this.entries.delete(identity);
            return { status: 'miss' };
        }

        return { status: 'hit', value: entry.value };
    }

    public async write(key: ReadCacheKey, value: TResult): Promise<void> {
        const identity = encodeReadCacheKey(key);

        this.entries.delete(identity);
        this.entries.set(identity, {
            value,
            expiresAt: this.now() + this.options.ttlMs,
        });

        while (this.entries.size > this.options.capacity) {
            const oldestKey = this.entries.keys().next().value as string | undefined;
            if (oldestKey === undefined) {
                return;
            }
            this.entries.delete(oldestKey);
        }
    }

    public get size(): number {
        this.evictExpiredEntries();
        return this.entries.size;
    }

    private evictExpiredEntries(): void {
        const now = this.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }
}

function encodeReadCacheKey(key: ReadCacheKey): string {
    return JSON.stringify([key.namespace, key.version, key.partition, key.value]);
}

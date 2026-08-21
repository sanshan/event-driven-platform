import type { CacheReadResult, CacheReader, CacheWriter, ReadCacheKey } from '@event-driven-platform/query';
import type { RedisClientType } from 'redis';

export interface ReadCacheCodec<TResult> {
    readonly serialize: (value: TResult) => string;
    readonly deserialize: (value: string) => TResult;
}

export interface RedisReadCacheKeyEncoder {
    readonly encode: (key: ReadCacheKey) => string;
}

export interface RedisReadCacheTtlPolicy {
    readonly resolveTtlMs: () => number;
}

export interface RedisReadCacheReaderOptions<TResult> {
    readonly client: RedisClientType;
    readonly codec: ReadCacheCodec<TResult>;
    readonly keyEncoder?: RedisReadCacheKeyEncoder;
}

export interface RedisReadCacheWriterOptions<TResult> extends RedisReadCacheReaderOptions<TResult> {
    readonly ttlPolicy: RedisReadCacheTtlPolicy;
}

export class RedisReadCacheReader<TResult> implements CacheReader<TResult> {
    private readonly keyEncoder: RedisReadCacheKeyEncoder;

    public constructor(private readonly options: RedisReadCacheReaderOptions<TResult>) {
        this.keyEncoder = options.keyEncoder ?? defaultRedisReadCacheKeyEncoder;
    }

    public async read(key: ReadCacheKey): Promise<CacheReadResult<TResult>> {
        try {
            const raw = await this.options.client.get(this.keyEncoder.encode(key));
            if (raw === null) {
                return { status: 'miss' };
            }

            return {
                status: 'hit',
                value: this.options.codec.deserialize(raw),
            };
        } catch (error) {
            return { status: 'error', error };
        }
    }
}

export class RedisReadCacheWriter<TResult> implements CacheWriter<TResult> {
    private readonly keyEncoder: RedisReadCacheKeyEncoder;

    public constructor(private readonly options: RedisReadCacheWriterOptions<TResult>) {
        this.keyEncoder = options.keyEncoder ?? defaultRedisReadCacheKeyEncoder;
    }

    public async write(key: ReadCacheKey, value: TResult): Promise<void> {
        const ttlMs = this.options.ttlPolicy.resolveTtlMs();
        if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
            throw new RangeError('Redis read cache TTL must resolve to a positive integer number of milliseconds.');
        }

        const serialized = this.options.codec.serialize(value);
        await this.options.client.set(this.keyEncoder.encode(key), serialized, { PX: ttlMs });
    }
}

export interface RedisReadCacheTtlPolicyOptions {
    readonly ttlMs: number;
    readonly jitterRatio?: number;
    readonly random?: () => number;
}

export function createRedisReadCacheTtlPolicy(options: RedisReadCacheTtlPolicyOptions): RedisReadCacheTtlPolicy {
    if (!Number.isInteger(options.ttlMs) || options.ttlMs <= 0) {
        throw new RangeError('Redis read cache ttlMs must be a positive integer.');
    }

    const jitterRatio = options.jitterRatio ?? 0;
    if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio >= 1) {
        throw new RangeError('Redis read cache jitterRatio must be greater than or equal to 0 and less than 1.');
    }

    const random = options.random ?? Math.random;

    return {
        resolveTtlMs: () => {
            const randomValue = random();
            if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
                throw new RangeError('Redis read cache random source must return a value in [0, 1).');
            }

            const spread = options.ttlMs * jitterRatio;
            const jitter = spread === 0 ? 0 : randomValue * spread * 2 - spread;
            return Math.max(1, Math.round(options.ttlMs + jitter));
        },
    };
}

export function createJsonReadCacheCodec<TResult>(): ReadCacheCodec<TResult> {
    return {
        serialize: (value) => JSON.stringify(value),
        deserialize: (value) => JSON.parse(value) as TResult,
    };
}

export const defaultRedisReadCacheKeyEncoder: RedisReadCacheKeyEncoder = {
    encode: (key) =>
        `read-cache:${encodeURIComponent(key.namespace)}:${encodeURIComponent(key.version)}:${encodeURIComponent(key.partition)}:${encodeURIComponent(key.value)}`,
};

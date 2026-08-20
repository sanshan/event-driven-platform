export interface ReadCacheKey {
    readonly namespace: string;
    readonly version: string;
    readonly partition: string;
    readonly value: string;
}

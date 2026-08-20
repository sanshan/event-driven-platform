export interface RateLimitConsumeRequest {
    readonly bucketKey: string;

    readonly limit: number;

    readonly windowMs: number;

    readonly cost: number;
}

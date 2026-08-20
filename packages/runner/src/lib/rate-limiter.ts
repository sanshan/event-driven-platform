export interface RateLimitConsumeRequest {
    readonly bucketKey: string;

    readonly limit: number;

    readonly windowMs: number;

    readonly cost: number;
}

export interface RateLimitAllowed {
    readonly type: 'allowed';
}

export interface RateLimitRejected {
    readonly type: 'rejected';
}

export type RateLimitDecision = RateLimitAllowed | RateLimitRejected;

export interface RateLimiter {
    consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision>;
}

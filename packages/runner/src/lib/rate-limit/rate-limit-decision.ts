export interface RateLimitAllowed {
    readonly type: 'allowed';
}

export interface RateLimitRejected {
    readonly type: 'rejected';
}

export type RateLimitDecision = RateLimitAllowed | RateLimitRejected;

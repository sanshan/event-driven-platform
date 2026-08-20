import type { RateLimitConsumeRequest } from './rate-limit-consume-request.js';
import type { RateLimitDecision } from './rate-limit-decision.js';

export interface RateLimiter {
    consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision>;
}

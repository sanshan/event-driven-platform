import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ExecutionPolicy = 'guard' | 'rate-limit';

const DETAILS: Record<ExecutionPolicy, { readonly code: string; readonly message: string }> = {
    guard: {
        code: 'guard-evaluator-unavailable',
        message: 'Guard evaluation is configured but no GuardEvaluator is available.',
    },
    'rate-limit': {
        code: 'rate-limiter-unavailable',
        message: 'Rate limiting is configured but no RateLimiter is available.',
    },
};

export class ExecutionPolicyUnavailableError extends ExecutionFailureError {
    constructor(readonly policy: ExecutionPolicy) {
        const { code, message } = DETAILS[policy];

        super({ code, message, retryable: false });
    }
}

import type { ExecutionFailure } from '@event-driven-platform/execution';

export class GuardEvaluatorUnavailableError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor() {
        const message = 'Guard evaluation is configured but no GuardEvaluator is available.';

        super(message);

        this.name = 'GuardEvaluatorUnavailableError';
        this.executionFailure = {
            code: 'guard-evaluator-unavailable',
            message,
            retryable: false,
        };
    }
}

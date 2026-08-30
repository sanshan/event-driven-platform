import { ExecutionError } from '@event-driven-platform/execution';

export class GuardEvaluatorUnavailableError extends ExecutionError {
    constructor() {
        const message = 'Guard evaluation is configured but no GuardEvaluator is available.';

        super({
            code: 'guard-evaluator-unavailable',
            message,
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    }
}

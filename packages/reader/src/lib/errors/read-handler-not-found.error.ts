import { ExecutionError } from '@event-driven-platform/execution';

export class ReadHandlerNotFoundError extends ExecutionError {
    constructor() {
        super({
            code: 'read-handler-not-found',
            message: 'No ReadHandler is available for the requested Read.',
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    }
}

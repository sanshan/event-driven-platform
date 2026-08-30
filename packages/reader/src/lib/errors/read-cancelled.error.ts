import { ExecutionError } from '@event-driven-platform/execution';

export class ReadCancelledError extends ExecutionError {
    constructor() {
        super({
            code: 'read-cancelled',
            message: 'Read execution was cancelled.',
            classification: 'cancelled',
            retry: 'never',
            retryable: false,
        });
    }
}

import { ExecutionFailureError } from '@event-driven-platform/execution';

export class ReadCancelledError extends ExecutionFailureError {
    constructor() {
        super({
            code: 'read-cancelled',
            message: 'Read execution was cancelled.',
            retryable: false,
        });
    }
}

import { ExecutionError } from '@event-driven-platform/execution';

export class ReadExecutionOwnershipLostError extends ExecutionError {
    constructor() {
        super({
            code: 'read-execution-ownership-lost',
            message: 'Distributed read execution ownership was lost before the result could be published.',
            classification: 'conflict',
            retry: 'caller',
            retryable: false,
        });
    }
}

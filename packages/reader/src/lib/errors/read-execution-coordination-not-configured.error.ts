import { ExecutionFailureError } from '@event-driven-platform/execution';

export class ReadExecutionCoordinationNotConfiguredError extends ExecutionFailureError {
    constructor(reason: string) {
        super({
            code: 'read-execution-coordination-not-configured',
            message: `Distributed read coordination is not configured: ${reason}`,
            retryable: false,
        });
    }
}

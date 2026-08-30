import { ExecutionError } from '@event-driven-platform/execution';

export class ReadExecutionCoordinationNotConfiguredError extends ExecutionError {
    constructor(reason: string) {
        super({
            code: 'read-execution-coordination-not-configured',
            message: `Distributed read coordination is not configured: ${reason}`,
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    }
}

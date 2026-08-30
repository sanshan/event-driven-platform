import { ExecutionError } from '@event-driven-platform/execution';

export class ReadExecutionCoordinatorUnavailableError extends ExecutionError {
    constructor(reason: string) {
        super({
            code: 'read-execution-coordinator-unavailable',
            message: `Read execution coordinator is unavailable: ${reason}`,
            classification: 'unavailable',
            retry: 'caller',
            retryable: false,
        });
    }
}

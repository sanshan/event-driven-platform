import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ReadExecutionCoordinatorFailureOutcome = 'unavailable' | 'ownership-lost';

export class ReadExecutionCoordinatorFailedError extends ExecutionFailureError {
    constructor(
        readonly outcome: ReadExecutionCoordinatorFailureOutcome,
        readonly reason?: string,
    ) {
        const message =
            outcome === 'unavailable'
                ? `Read execution coordinator is unavailable: ${reason}`
                : 'Distributed read execution ownership was lost before the result could be published.';

        super({
            code: `read-execution-coordinator-${outcome}`,
            message,
            retryable: true,
        });
    }
}

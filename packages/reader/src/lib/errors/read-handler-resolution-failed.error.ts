import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ReadHandlerResolutionFailureStatus = 'not-found' | 'ambiguous';

export class ReadHandlerResolutionFailedError extends ExecutionFailureError {
    constructor(
        readonly status: ReadHandlerResolutionFailureStatus,
        readonly detail?: string,
    ) {
        const message =
            status === 'not-found'
                ? 'No ReadHandler is available for the requested Read.'
                : `ReadHandler resolution is ambiguous: ${detail}`;

        super({
            code: `read-handler-${status}`,
            message,
            retryable: false,
        });
    }
}

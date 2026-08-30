import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ReadHandlerResolutionFailureStatus = 'not-found' | 'ambiguous';

const DETAILS: Record<
    ReadHandlerResolutionFailureStatus,
    { readonly code: string; readonly message: (detail?: string) => string }
> = {
    'not-found': {
        code: 'read-handler-not-found',
        message: () => 'No ReadHandler is available for the requested Read.',
    },
    ambiguous: {
        code: 'read-handler-ambiguous',
        message: (detail) => `ReadHandler resolution is ambiguous: ${detail}`,
    },
};

export class ReadHandlerResolutionFailedError extends ExecutionFailureError {
    readonly status: ReadHandlerResolutionFailureStatus;

    readonly detail?: string;

    constructor(status: 'not-found');
    constructor(status: 'ambiguous', detail: string);
    constructor(status: ReadHandlerResolutionFailureStatus, detail?: string) {
        const { code, message } = DETAILS[status];

        super({ code, message: message(detail), retryable: false });

        this.status = status;
        this.detail = detail;
    }
}

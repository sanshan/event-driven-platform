import { ExecutionFailureError } from '@event-driven-platform/execution';

export type ReadExecutionCoordinatorFailureOutcome = 'unavailable' | 'ownership-lost';

const DETAILS: Record<
    ReadExecutionCoordinatorFailureOutcome,
    { readonly code: string; readonly message: (reason?: string) => string }
> = {
    unavailable: {
        code: 'read-execution-coordinator-unavailable',
        message: (reason) => `Read execution coordinator is unavailable: ${reason}`,
    },
    'ownership-lost': {
        code: 'read-execution-coordinator-ownership-lost',
        message: () =>
            'Distributed read execution ownership was lost before the result could be published.',
    },
};

export class ReadExecutionCoordinatorFailedError extends ExecutionFailureError {
    readonly outcome: ReadExecutionCoordinatorFailureOutcome;

    readonly reason?: string;

    constructor(outcome: 'unavailable', reason: string);
    constructor(outcome: 'ownership-lost');
    constructor(outcome: ReadExecutionCoordinatorFailureOutcome, reason?: string) {
        const { code, message } = DETAILS[outcome];

        super({ code, message: message(reason), retryable: true });

        this.outcome = outcome;
        this.reason = reason;
    }
}

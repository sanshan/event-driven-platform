import type { ExecutionId } from '@event-driven-platform/execution';
import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { ExecutionTransitionRejected } from '@event-driven-platform/execution-log-store';
import type { AnyOperation } from '@event-driven-platform/operation';

export class ExecutionTransitionRejectedError extends ExecutionFailureError {
    constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete' | 'fail',
        readonly rejection: ExecutionTransitionRejected<AnyOperation>,
    ) {
        const message = `Execution "${executionId}" ${transition} transition was rejected with "${rejection.type}".`;

        super({
            code: `execution-${rejection.type}`,
            message,
            retryable: false,
        });
    }
}

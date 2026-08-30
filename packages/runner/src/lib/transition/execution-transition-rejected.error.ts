import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';
import type { ExecutionTransitionRejected } from '@event-driven-platform/execution-log-store';
import type { AnyOperation } from '@event-driven-platform/operation';

export class ExecutionTransitionRejectedError extends ExecutionError {
    constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete' | 'fail',
        readonly rejection: ExecutionTransitionRejected<AnyOperation>,
    ) {
        super({
            code: 'execution-transition-rejected',
            message: `Execution "${executionId}" ${transition} transition was rejected with "${rejection.type}".`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
    }
}

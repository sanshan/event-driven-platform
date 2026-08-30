import type { ExecutionId } from '@event-driven-platform/execution';
import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { UseCaseExecutionTransitionRejected } from '@event-driven-platform/use-case-execution-store';

export class UseCaseExecutionTransitionError extends ExecutionFailureError {
    constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete',
        readonly rejection: UseCaseExecutionTransitionRejected,
    ) {
        const message = `UseCase execution ${executionId} ${transition} transition was rejected: ${rejection.type}.`;

        super({
            code: `use-case-execution-${rejection.type}`,
            message,
            retryable: false,
        });
    }
}

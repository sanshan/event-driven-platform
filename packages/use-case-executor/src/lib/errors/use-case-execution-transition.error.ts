import { ExecutionError, type ExecutionId } from '@event-driven-platform/execution';
import type { UseCaseExecutionTransitionRejected } from '@event-driven-platform/use-case-execution-store';

export class UseCaseExecutionTransitionError extends ExecutionError {
    public constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete',
        readonly rejection: UseCaseExecutionTransitionRejected,
    ) {
        super({
            code: 'use-case-execution-transition-rejected',
            message: `UseCase execution ${executionId} ${transition} transition was rejected: ${rejection.type}.`,
            classification: 'conflict',
            retry: 'never',
            retryable: false,
        });
    }
}

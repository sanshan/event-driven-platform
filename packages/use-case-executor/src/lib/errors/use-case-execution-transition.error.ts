import type { ExecutionId } from '@event-driven-platform/execution';
import type { UseCaseExecutionTransitionRejected } from '@event-driven-platform/use-case-execution-store';

export class UseCaseExecutionTransitionError extends Error {
    public constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete',
        readonly rejection: UseCaseExecutionTransitionRejected,
    ) {
        super(
            `UseCase execution ${executionId} ${transition} transition was rejected: ${rejection.type}.`,
        );
        this.name = 'UseCaseExecutionTransitionError';
    }
}

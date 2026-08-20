import type { ExecutionId } from '@event-driven-platform/execution';
import type { ExecutionTransitionRejected } from '@event-driven-platform/execution-log-store';
import type { AnyOperation } from '@event-driven-platform/operation';

export class ExecutionTransitionRejectedError extends Error {
    override readonly name = 'ExecutionTransitionRejectedError';

    constructor(
        readonly executionId: ExecutionId,
        readonly transition: 'complete' | 'fail',
        readonly rejection: ExecutionTransitionRejected<AnyOperation>,
    ) {
        super(
            `Execution "${executionId}" ${transition} transition was rejected with "${rejection.type}".`,
        );

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

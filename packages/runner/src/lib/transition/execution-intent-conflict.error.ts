import type { ExecutionId } from '@event-driven-platform/execution';

export class ExecutionIntentConflictError extends Error {
    override readonly name = 'ExecutionIntentConflictError';

    constructor(readonly executionId: ExecutionId) {
        super(`Execution "${executionId}" conflicts with the persisted Operation.`);

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

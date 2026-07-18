import type { ExecutionId } from '@event-driven-platform/execution';

export class ExecutionAlreadyInProgressError extends Error {
    override readonly name = 'ExecutionAlreadyInProgressError';

    constructor(readonly executionId: ExecutionId) {
        super(`Execution "${executionId}" is already in progress.`);

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

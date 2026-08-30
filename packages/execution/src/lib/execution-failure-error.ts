import type { ExecutionFailure } from './execution-failure.js';

export class ExecutionFailureError extends Error {
    readonly executionFailure: ExecutionFailure;

    constructor(executionFailure: ExecutionFailure, options?: ErrorOptions) {
        super(executionFailure.message, options);

        this.name = new.target.name;
        this.executionFailure = executionFailure;
    }
}

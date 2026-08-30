import type { ExecutionFailureCarrier } from './execution-failure-carrier.js';
import type { ExecutionFailure } from './execution-failure.js';

/** Canonical Error carrier for failures exposed by EDP execution boundaries. */
export class ExecutionError extends Error implements ExecutionFailureCarrier {
    constructor(
        readonly executionFailure: ExecutionFailure,
        options?: ErrorOptions,
    ) {
        super(executionFailure.message, options);

        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

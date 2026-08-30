import type { ExecutionFailure } from './execution-failure.js';

/** An Error-compatible boundary that exposes a canonical serializable failure descriptor. */
export interface ExecutionFailureCarrier {
    readonly executionFailure: ExecutionFailure;
}

/**
 * Describes which boundary may decide to retry a failure.
 *
 * This is failure semantics, not retry policy. Delay, attempt limits, and retry execution remain
 * owned by the responsible execution boundary and its existing configuration.
 */
export type ExecutionFailureRetry = 'never' | 'current-execution' | 'caller';

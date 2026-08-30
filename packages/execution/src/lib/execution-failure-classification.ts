/**
 * Bounded, transport-neutral meaning of an execution failure.
 *
 * Applications and transport adapters may map these values to their own policies. They are not
 * HTTP statuses, logger levels, or telemetry-backend dimensions.
 */
export type ExecutionFailureClassification =
    | 'cancelled'
    | 'conflict'
    | 'internal'
    | 'invalid-configuration'
    | 'policy-rejected'
    | 'timeout'
    | 'unavailable';

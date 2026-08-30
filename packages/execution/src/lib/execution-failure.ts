import type { ExecutionFailureClassification } from './execution-failure-classification.js';
import type { ExecutionFailureRetry } from './execution-failure-retry.js';

interface ExecutionFailureDescriptor {
    readonly code: string;

    readonly message: string;

    readonly classification: ExecutionFailureClassification;
}

type ExecutionFailureRetryCompatibility =
    | {
          readonly retry: Extract<ExecutionFailureRetry, 'never' | 'caller'>;

          /**
           * @deprecated Use `retry`. This compatibility field is true only when the current
           * execution boundary may apply its configured retry policy.
           */
          readonly retryable: false;
      }
    | {
          readonly retry: Extract<ExecutionFailureRetry, 'current-execution'>;

          /**
           * @deprecated Use `retry`. This compatibility field is true only when the current
           * execution boundary may apply its configured retry policy.
           */
          readonly retryable: true;
      };

/**
 * Serializable, transport-neutral description of an execution failure.
 *
 * `message` is diagnostic text. Consumers make decisions from `code`, `classification`, and
 * `retry` without parsing it. Runtime causes and stacks belong to `ExecutionError`, not here.
 */
export type ExecutionFailure = ExecutionFailureDescriptor & ExecutionFailureRetryCompatibility;

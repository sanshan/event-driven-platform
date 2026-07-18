import type { ExecutionAttemptIdDescriptor } from './execution-attempt-id.js';

export function buildExecutionAttemptIdKey(descriptor: ExecutionAttemptIdDescriptor): string {
    return [
        `executionId=${encodeURIComponent(descriptor.executionId)}`,
        `attemptNumber=${descriptor.attemptNumber}`,
    ].join('&');
}

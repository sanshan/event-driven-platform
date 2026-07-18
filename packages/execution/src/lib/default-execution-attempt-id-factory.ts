import { v5 as uuidV5 } from 'uuid';

import { buildExecutionAttemptIdKey } from './build-execution-attempt-id-key.js';
import { EXECUTION_ATTEMPT_ID_UUID_NAMESPACE } from './execution-attempt-id-namespace.js';
import { executionAttemptIdDescriptorSchema } from './execution-attempt-id-descriptor-schema.js';
import type {
    ExecutionAttemptId,
    ExecutionAttemptIdDescriptor,
    ExecutionAttemptIdFactory,
} from './execution-attempt-id.js';

export class DefaultExecutionAttemptIdFactory implements ExecutionAttemptIdFactory {
    create(descriptor: ExecutionAttemptIdDescriptor): ExecutionAttemptId {
        const parsed = executionAttemptIdDescriptorSchema.parse(descriptor);

        const key = buildExecutionAttemptIdKey({
            executionId: descriptor.executionId,
            attemptNumber: parsed.attemptNumber,
        });

        return uuidV5(key, EXECUTION_ATTEMPT_ID_UUID_NAMESPACE) as ExecutionAttemptId;
    }
}

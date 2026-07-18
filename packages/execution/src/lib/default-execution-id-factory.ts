import { v5 as uuidV5 } from 'uuid';
import * as z from 'zod';

import type { ExecutionId, ExecutionIdFactory } from './execution-id.js';
import { EXECUTION_ID_UUID_NAMESPACE } from './execution-id-namespace.js';

const intentIdSchema = z
    .string()
    .min(1, 'Intent identifier must not be empty.')
    .refine(
        (value) => value === value.trim(),
        'Intent identifier must not contain leading or trailing whitespace.',
    );

export class DefaultExecutionIdFactory implements ExecutionIdFactory {
    create(intentId: string): ExecutionId {
        const parsedIntentId = intentIdSchema.parse(intentId);

        return uuidV5(parsedIntentId, EXECUTION_ID_UUID_NAMESPACE) as ExecutionId;
    }
}

import type { Brand } from '@event-driven-platform/types';

import type { ExecutionId } from './execution-id.js';

export type ExecutionAttemptId = Brand<string, 'ExecutionAttemptId'>;

export interface ExecutionAttemptIdDescriptor {
    readonly executionId: ExecutionId;

    readonly attemptNumber: number;
}

export interface ExecutionAttemptIdFactory {
    create(descriptor: ExecutionAttemptIdDescriptor): ExecutionAttemptId;
}

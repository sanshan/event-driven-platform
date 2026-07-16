import type { CommittedOperationRejection } from './committed-operation-rejection.js';
import type { RolledBackOperationRejection } from './rolled-back-operation-rejection.js';
import type { SuccessfulOperationResult } from './successful-operation-result.js';

export type OperationResult =
    | SuccessfulOperationResult<unknown, unknown>
    | CommittedOperationRejection<unknown, unknown, unknown>
    | RolledBackOperationRejection<unknown, unknown>;

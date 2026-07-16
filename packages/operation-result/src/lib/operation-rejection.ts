import type { CommittedOperationRejection } from './committed-operation-rejection.js';
import type { RolledBackOperationRejection } from './rolled-back-operation-rejection.js';

export type OperationRejection =
    | CommittedOperationRejection<unknown, unknown, unknown>
    | RolledBackOperationRejection<unknown, unknown>;

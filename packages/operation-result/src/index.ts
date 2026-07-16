export type { CommittedOperationRejection } from './lib/committed-operation-rejection.js';
export type { OperationRejection } from './lib/operation-rejection.js';
export type { OperationResult } from './lib/operation-result.js';

export { OperationResults } from './lib/operation-result.factory.js';

export type {
    CommittedOperationRejectionInput,
    RolledBackOperationRejectionInput,
    SuccessfulOperationResultInput,
} from './lib/operation-result.factory.js';

export {
    isCommittedOperationRejection,
    isOperationRejection,
    isRolledBackOperationRejection,
    isSuccessfulOperationResult,
} from './lib/operation-result.type-guards.js';

export type { RolledBackOperationRejection } from './lib/rolled-back-operation-rejection.js';
export type { SuccessfulOperationResult } from './lib/successful-operation-result.js';

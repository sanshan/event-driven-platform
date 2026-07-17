import type { AnyEvent } from '@event-driven-platform/event';

import type { CommittedOperationRejection } from './committed-operation-rejection.js';
import type { RolledBackOperationRejection } from './rolled-back-operation-rejection.js';
import type { SuccessfulOperationResult } from './successful-operation-result.js';

export type OperationResult =
    | SuccessfulOperationResult<unknown, AnyEvent>
    | CommittedOperationRejection<unknown, unknown, AnyEvent>
    | RolledBackOperationRejection<unknown, unknown>;

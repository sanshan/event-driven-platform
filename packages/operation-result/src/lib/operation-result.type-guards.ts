import type { AnyEvent } from '@event-driven-platform/event';

import type { CommittedOperationRejection } from './committed-operation-rejection.js';
import type { OperationRejection } from './operation-rejection.js';
import type { OperationResult } from './operation-result.js';
import type { RolledBackOperationRejection } from './rolled-back-operation-rejection.js';
import type { SuccessfulOperationResult } from './successful-operation-result.js';

export function isSuccessfulOperationResult<TResult extends OperationResult>(
    result: TResult,
): result is Extract<TResult, SuccessfulOperationResult<unknown, AnyEvent>> {
    return result.status === 'success';
}

export function isOperationRejection<TResult extends OperationResult>(
    result: TResult,
): result is Extract<TResult, OperationRejection> {
    return result.status === 'rejected';
}

export function isCommittedOperationRejection<TResult extends OperationResult>(
    result: TResult,
): result is Extract<TResult, CommittedOperationRejection<unknown, unknown, AnyEvent>> {
    return result.status === 'rejected' && result.completion === 'committed';
}

export function isRolledBackOperationRejection<TResult extends OperationResult>(
    result: TResult,
): result is Extract<TResult, RolledBackOperationRejection<unknown, unknown>> {
    return result.status === 'rejected' && result.completion === 'rolled-back';
}

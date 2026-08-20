import type { AnyOperation } from '@event-driven-platform/operation';

import type { GuardOptions } from './guard-options.js';

export interface GuardEvaluationRequest<TOperation extends AnyOperation> {
    readonly guard: GuardOptions;

    readonly operation: TOperation;
}

export interface GuardEvaluator {
    evaluate<TOperation extends AnyOperation>(
        request: GuardEvaluationRequest<TOperation>,
    ): Promise<boolean>;
}

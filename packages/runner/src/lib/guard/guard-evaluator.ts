import type { AnyOperation } from '@event-driven-platform/operation';

import type { GuardEvaluationRequest } from './guard-evaluation-request.js';

export interface GuardEvaluator {
    evaluate<TOperation extends AnyOperation>(
        request: GuardEvaluationRequest<TOperation>,
    ): Promise<boolean>;
}

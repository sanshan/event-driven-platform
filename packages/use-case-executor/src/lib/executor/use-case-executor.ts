import type { UseCaseContext } from '@event-driven-platform/use-case';

import type { UseCaseExecutionRequest } from './use-case-execution-request.js';

export interface UseCaseExecutor {
    execute<TInput, TResult, TContext extends UseCaseContext = UseCaseContext>(
        request: UseCaseExecutionRequest<TInput, TResult, TContext>,
    ): Promise<TResult>;
}

import type { UseCaseExecutionRequest } from './use-case-execution-request.js';

export interface UseCaseExecutor {
    execute<TInput, TResult>(request: UseCaseExecutionRequest<TInput, TResult>): Promise<TResult>;
}

import type { UseCaseContext } from './use-case-context.js';

export interface UseCase<
    TInput,
    TResult,
    TContext extends UseCaseContext = UseCaseContext,
> {
    execute(input: TInput, context: TContext): Promise<TResult>;
}

import type { UseCase, UseCaseContext } from '@event-driven-platform/use-case';

export interface UseCaseExecutionRequest<
    TInput,
    TResult,
    TContext extends UseCaseContext = UseCaseContext,
> {
    readonly useCase: UseCase<TInput, TResult, TContext>;
    readonly input: TInput;
    readonly context: TContext;
}

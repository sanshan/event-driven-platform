import type { UseCaseContext } from './use-case-context.js';

export interface UseCase<TInput, TResult> {
    execute(input: TInput, context: UseCaseContext): Promise<TResult>;
}

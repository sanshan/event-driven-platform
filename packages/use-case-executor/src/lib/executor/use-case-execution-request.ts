import type { Intent } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';

export interface UseCaseExecutionRequest<TInput, TResult> {
    readonly useCase: UseCase<TInput, TResult>;
    readonly input: TInput;
    readonly intent: Intent;
    readonly correlationId: string;
}

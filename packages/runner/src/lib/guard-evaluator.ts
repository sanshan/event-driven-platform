import type { CommandOptions } from '@event-driven-platform/command';
import type { AnyOperation } from '@event-driven-platform/operation';

type ConfiguredGuard = NonNullable<CommandOptions['guards']>[number];

export interface GuardEvaluationRequest<TOperation extends AnyOperation> {
    readonly guard: ConfiguredGuard;

    readonly operation: TOperation;
}

export interface GuardEvaluator {
    evaluate<TOperation extends AnyOperation>(
        request: GuardEvaluationRequest<TOperation>,
    ): Promise<boolean>;
}

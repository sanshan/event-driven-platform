import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

export interface ResolvedOperationHandler<TOperation extends AnyOperation> {
    execute(operation: TOperation): Promise<OperationResultOf<TOperation>>;
}

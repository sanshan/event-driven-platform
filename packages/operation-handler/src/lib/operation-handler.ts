import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

export interface OperationHandler<TOperation extends AnyOperation> {
    execute(operation: TOperation): Promise<OperationResultOf<TOperation>>;
}

import type { AnyOperation } from '@event-driven-platform/operation';
import type { OperationHandler } from '@event-driven-platform/operation-handler';

export interface OperationHandlerResolver {
    resolve<TOperation extends AnyOperation>(operation: TOperation): OperationHandler<TOperation>;
}

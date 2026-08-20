import type { ExecutionId } from '@event-driven-platform/execution';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

import type { RunnerResultSource } from './runner-result-source.js';

export interface RunnerExecution<TOperation extends AnyOperation> {
    readonly executionId: ExecutionId;

    readonly resultSource: RunnerResultSource;

    readonly result: OperationResultOf<TOperation>;
}

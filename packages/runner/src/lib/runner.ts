import type { Command } from '@event-driven-platform/command';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

import type { RunnerExecution } from './runner-execution.js';

export interface Runner {
    execute<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<OperationResultOf<TOperation>>;

    executeDetailed<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<RunnerExecution<TOperation>>;
}

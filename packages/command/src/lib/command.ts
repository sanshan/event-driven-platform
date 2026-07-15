import type { AnyOperation } from '@event-driven-platform/operation';

import type { CommandContext } from './command-context.js';
import type { CommandOptions } from './command-options.js';

export interface Command<TOperation extends AnyOperation> {
    readonly operation: TOperation;

    readonly context: CommandContext;

    readonly options?: CommandOptions;
}

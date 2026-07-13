import type { Operation } from '@event-driven-platform/operation';
import type { Brand } from '@event-driven-platform/types';

import type { CommandOptions } from './command-options.js';

export interface Command<
    TName extends string,
    TAggregateId extends Brand<string, string>,
    TPayload,
> {
    readonly operation: Operation<TName, TAggregateId, TPayload>;

    readonly options?: CommandOptions;
}

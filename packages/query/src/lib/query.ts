import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

import type { QueryContext } from './query-context.js';
import type { QueryOptions } from './query-options.js';

export interface Query<TRead extends AnyRead> {
    readonly read: TRead;

    readonly context: QueryContext;

    readonly options?: QueryOptions<ReadResultOf<TRead>>;
}

export type AnyQuery = Query<AnyRead>;

export type QueryResultOf<TQuery extends AnyQuery> =
    TQuery extends Query<infer TRead> ? ReadResultOf<TRead> : never;

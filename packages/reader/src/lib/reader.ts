import type { AnyQuery, QueryResultOf } from '@event-driven-platform/query';

export interface Reader {
    execute<TQuery extends AnyQuery>(query: TQuery): Promise<QueryResultOf<TQuery>>;
}

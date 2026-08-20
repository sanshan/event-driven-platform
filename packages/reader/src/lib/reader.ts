import type { Query } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

export interface Reader {
    execute<TRead extends AnyRead>(query: Query<TRead>): Promise<ReadResultOf<TRead>>;
}

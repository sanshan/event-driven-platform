import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

export interface ReadHandler<TRead extends AnyRead> {
    execute(read: TRead): Promise<ReadResultOf<TRead>>;
}

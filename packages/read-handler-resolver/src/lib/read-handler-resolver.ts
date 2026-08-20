import type { AnyRead } from '@event-driven-platform/read';
import type { ReadHandler } from '@event-driven-platform/read-handler';

export type ReadHandlerResolution<TRead extends AnyRead> =
    | {
          readonly status: 'resolved';
          readonly handlers: readonly [ReadHandler<TRead>, ...ReadHandler<TRead>[]];
      }
    | {
          readonly status: 'not-found';
      }
    | {
          readonly status: 'ambiguous';
          readonly reason: string;
      };

export interface ReadHandlerResolver {
    resolve<TRead extends AnyRead>(read: TRead): ReadHandlerResolution<TRead>;
}

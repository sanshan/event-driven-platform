import type { AnyEvent } from '@event-driven-platform/event';

export interface CommittedOperationRejection<
    TReason,
    TData = void,
    TEvent extends AnyEvent = never,
> {
    readonly status: 'rejected';

    readonly completion: 'committed';

    readonly reason: TReason;

    readonly data: TData;

    readonly events: readonly TEvent[];
}

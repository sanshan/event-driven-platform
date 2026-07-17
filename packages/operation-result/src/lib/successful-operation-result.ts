import type { AnyEvent } from '@event-driven-platform/event';

export interface SuccessfulOperationResult<TData = void, TEvent extends AnyEvent = never> {
    readonly status: 'success';

    readonly data: TData;

    readonly events: readonly TEvent[];
}

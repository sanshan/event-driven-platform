export interface CommittedOperationRejection<TReason, TData = void, TEvent = never> {
    readonly status: 'rejected';
    readonly completion: 'committed';

    readonly reason: TReason;
    readonly data: TData;
    readonly events: readonly TEvent[];
}

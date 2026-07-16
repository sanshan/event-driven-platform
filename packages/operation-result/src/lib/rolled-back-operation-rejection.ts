export interface RolledBackOperationRejection<TReason, TData = void> {
    readonly status: 'rejected';
    readonly completion: 'rolled-back';

    readonly reason: TReason;
    readonly data: TData;
    readonly events: readonly [];
}

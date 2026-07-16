export interface SuccessfulOperationResult<TData = void, TEvent = never> {
    readonly status: 'success';

    readonly data: TData;
    readonly events: readonly TEvent[];
}

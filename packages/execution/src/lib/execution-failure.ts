export interface ExecutionFailure {
    readonly code: string;

    readonly message: string;

    readonly retryable: boolean;
}

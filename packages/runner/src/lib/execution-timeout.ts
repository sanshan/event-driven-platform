export interface ExecutionCompletedBeforeTimeout<TResult> {
    readonly type: 'completed';

    readonly result: TResult;
}

export interface ExecutionTimedOut {
    readonly type: 'timed-out';
}

export type ExecutionTimeoutResult<TResult> =
    | ExecutionCompletedBeforeTimeout<TResult>
    | ExecutionTimedOut;

export interface ExecutionTimeout {
    execute<TResult>(
        work: () => Promise<TResult>,
        timeoutMs: number,
    ): Promise<ExecutionTimeoutResult<TResult>>;
}

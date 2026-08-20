export type ReadTimeoutResult<TResult> =
    | {
          readonly type: 'completed';
          readonly result: TResult;
      }
    | {
          readonly type: 'timed-out';
      };

export interface ReadTimeout {
    execute<TResult>(work: () => Promise<TResult>, timeoutMs: number): Promise<ReadTimeoutResult<TResult>>;
}

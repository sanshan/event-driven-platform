export type CacheReadResult<TResult> =
    | {
          readonly status: 'hit';
          readonly value: TResult;
      }
    | {
          readonly status: 'miss';
      }
    | {
          readonly status: 'error';
          readonly error: unknown;
      };

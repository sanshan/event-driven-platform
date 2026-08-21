import { ReadCancelledError } from '../errors/read-cancelled.error.js';
import { ReadTimedOutError } from '../errors/read-timed-out.error.js';
import type { ReadTimeout } from './read-timeout.js';

export interface ReadExecutionControls {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
}

export class ReadExecutionControl {
    public constructor(private readonly readTimeout: ReadTimeout) {}

    public async execute<TResult>(
        work: () => Promise<TResult>,
        controls: ReadExecutionControls = {},
    ): Promise<TResult> {
        if (controls.signal?.aborted === true) {
            throw new ReadCancelledError();
        }

        if (controls.timeoutMs === undefined) {
            return this.awaitWithCancellation(work(), controls.signal);
        }

        const timedExecution = await this.awaitWithCancellation(
            this.readTimeout.execute(work, controls.timeoutMs),
            controls.signal,
        );

        if (timedExecution.type === 'timed-out') {
            throw new ReadTimedOutError(controls.timeoutMs);
        }

        return timedExecution.result;
    }

    private async awaitWithCancellation<TResult>(
        work: Promise<TResult>,
        signal: AbortSignal | undefined,
    ): Promise<TResult> {
        if (signal === undefined) {
            return work;
        }

        if (signal.aborted) {
            throw new ReadCancelledError();
        }

        return new Promise<TResult>((resolve, reject) => {
            const onAbort = (): void => {
                reject(new ReadCancelledError());
            };

            signal.addEventListener('abort', onAbort, { once: true });

            void work.then(
                (result) => {
                    signal.removeEventListener('abort', onAbort);
                    resolve(result);
                },
                (error: unknown) => {
                    signal.removeEventListener('abort', onAbort);
                    reject(error);
                },
            );
        });
    }
}

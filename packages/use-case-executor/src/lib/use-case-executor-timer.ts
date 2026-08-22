export interface UseCaseExecutorTimerHandle {
    cancel(): void;
}

export interface UseCaseExecutorTimer {
    schedule(delayMs: number, callback: () => void): UseCaseExecutorTimerHandle;
}

export class SystemUseCaseExecutorTimer implements UseCaseExecutorTimer {
    public schedule(delayMs: number, callback: () => void): UseCaseExecutorTimerHandle {
        const timeout = setTimeout(callback, delayMs);

        return {
            cancel: () => clearTimeout(timeout),
        };
    }
}

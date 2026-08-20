export interface RetryDelay {
    wait(delayMs: number): Promise<void>;
}

import type { RetryDelay } from './retry-delay.js';

export class DefaultRetryDelay implements RetryDelay {
    async wait(delayMs: number): Promise<void> {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, delayMs);
        });
    }
}

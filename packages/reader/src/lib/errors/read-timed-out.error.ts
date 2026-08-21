export class ReadTimedOutError extends Error {
    constructor(readonly timeoutMs: number) {
        super(`Read execution timed out after ${timeoutMs}ms.`);
        this.name = 'ReadTimedOutError';
    }
}

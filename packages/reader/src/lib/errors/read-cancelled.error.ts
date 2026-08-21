export class ReadCancelledError extends Error {
    constructor() {
        super('Read execution was cancelled.');
        this.name = 'ReadCancelledError';
    }
}

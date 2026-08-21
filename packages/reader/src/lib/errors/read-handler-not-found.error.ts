export class ReadHandlerNotFoundError extends Error {
    constructor() {
        super('No ReadHandler is available for the requested Read.');
        this.name = 'ReadHandlerNotFoundError';
    }
}

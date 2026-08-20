export class ReadHandlerAmbiguousError extends Error {
    constructor(readonly reason: string) {
        super(`ReadHandler resolution is ambiguous: ${reason}`);
        this.name = 'ReadHandlerAmbiguousError';
    }
}

export class ReadExecutionCoordinationNotConfiguredError extends Error {
    constructor(reason: string) {
        super(`Distributed read coordination is not configured: ${reason}`);
        this.name = 'ReadExecutionCoordinationNotConfiguredError';
    }
}

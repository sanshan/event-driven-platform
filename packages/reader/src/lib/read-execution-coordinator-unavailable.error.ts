export class ReadExecutionCoordinatorUnavailableError extends Error {
    constructor(reason: string) {
        super(`Read execution coordinator is unavailable: ${reason}`);
        this.name = 'ReadExecutionCoordinatorUnavailableError';
    }
}

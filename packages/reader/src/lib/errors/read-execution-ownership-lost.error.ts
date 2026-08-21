export class ReadExecutionOwnershipLostError extends Error {
    constructor() {
        super('Distributed read execution ownership was lost before the result could be published.');
        this.name = 'ReadExecutionOwnershipLostError';
    }
}

import { ExecutionError } from '@event-driven-platform/execution';

export class ReadHandlerAmbiguousError extends ExecutionError {
    constructor(readonly reason: string) {
        super({
            code: 'read-handler-ambiguous',
            message: `ReadHandler resolution is ambiguous: ${reason}`,
            classification: 'invalid-configuration',
            retry: 'never',
            retryable: false,
        });
    }
}

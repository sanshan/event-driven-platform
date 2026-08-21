import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { ReadHandlerAmbiguousError } from '../errors/read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from '../errors/read-handler-not-found.error.js';

export class ReadSourceExecutor {
    public constructor(private readonly readHandlerResolver: ReadHandlerResolver) {}

    public execute<TRead extends AnyRead>(read: TRead): Promise<ReadResultOf<TRead>> {
        const resolution = this.readHandlerResolver.resolve(read);
        const handler = this.resolveHandler(resolution);

        return handler.execute(read);
    }

    private resolveHandler<TRead extends AnyRead>(resolution: ReadHandlerResolution<TRead>) {
        switch (resolution.status) {
            case 'resolved':
                return resolution.handlers[0];
            case 'not-found':
                throw new ReadHandlerNotFoundError();
            case 'ambiguous':
                throw new ReadHandlerAmbiguousError(resolution.reason);
        }
    }
}

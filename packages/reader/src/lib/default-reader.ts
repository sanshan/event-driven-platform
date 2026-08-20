import type { AnyQuery, QueryResultOf } from '@event-driven-platform/query';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { ReadHandlerAmbiguousError } from './read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from './read-handler-not-found.error.js';
import { ReadTimedOutError } from './read-timed-out.error.js';
import type { ReadTimeout } from './read-timeout.js';
import { DefaultReadTimeout } from './default-read-timeout.js';
import type { Reader } from './reader.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
}

export class DefaultReader implements Reader {
    private readonly readTimeout: ReadTimeout;

    constructor(private readonly dependencies: DefaultReaderDependencies) {
        this.readTimeout = dependencies.readTimeout ?? new DefaultReadTimeout();
    }

    async execute<TQuery extends AnyQuery>(query: TQuery): Promise<QueryResultOf<TQuery>> {
        if ('options' in query && query.options?.cache !== undefined) {
            throw new Error('Cached Query execution is not implemented yet.');
        }

        const resolution = this.dependencies.readHandlerResolver.resolve(query.read);
        const handler = this.resolveHandler(resolution);
        const timeoutMs = 'options' in query ? query.options?.timeoutMs : undefined;

        if (timeoutMs === undefined) {
            return handler.execute(query.read) as Promise<QueryResultOf<TQuery>>;
        }

        const timedExecution = await this.readTimeout.execute(
            () => handler.execute(query.read),
            timeoutMs,
        );

        if (timedExecution.type === 'timed-out') {
            throw new ReadTimedOutError(timeoutMs);
        }

        return timedExecution.result as QueryResultOf<TQuery>;
    }

    private resolveHandler<TRead extends AnyQuery['read']>(
        resolution: ReadHandlerResolution<TRead>,
    ) {
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

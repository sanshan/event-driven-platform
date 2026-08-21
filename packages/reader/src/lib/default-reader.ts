import { randomUUID } from 'node:crypto';

import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type { Query } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { CachedReadExecutor } from './cache/cached-read-executor.js';
import { ReadExecutionControl } from './control/read-execution-control.js';
import { DefaultReadTimeout } from './default-read-timeout.js';
import type { ReadTimeout } from './read-timeout.js';
import type { Reader } from './reader.js';
import { ReadSourceExecutor } from './source/read-source-executor.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
    readonly readExecutionCoordinator?: ReadExecutionCoordinator;
    readonly readExecutionOwnerIdFactory?: () => string;
}

export class DefaultReader implements Reader {
    private readonly sourceExecutor: ReadSourceExecutor;
    private readonly cachedExecutor: CachedReadExecutor;
    private readonly executionControl: ReadExecutionControl;

    public constructor(dependencies: DefaultReaderDependencies) {
        this.sourceExecutor = new ReadSourceExecutor(dependencies.readHandlerResolver);
        this.cachedExecutor = new CachedReadExecutor({
            sourceExecutor: this.sourceExecutor,
            readExecutionCoordinator: dependencies.readExecutionCoordinator,
            ownerIdFactory: dependencies.readExecutionOwnerIdFactory ?? randomUUID,
        });
        this.executionControl = new ReadExecutionControl(
            dependencies.readTimeout ?? new DefaultReadTimeout(),
        );
    }

    public execute<TRead extends AnyRead>(query: Query<TRead>): Promise<ReadResultOf<TRead>> {
        const cachePlan = query.options?.cache;
        const work =
            cachePlan === undefined
                ? () => this.sourceExecutor.execute(query.read)
                : () => this.cachedExecutor.execute(query, cachePlan);

        return this.executionControl.execute(work, query.options);
    }
}

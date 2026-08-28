import { randomUUID } from 'node:crypto';

import { SystemClock } from '@event-driven-platform/clock';
import {
    NoopObserver,
    SafeObserver,
    type ReaderObservation,
    type ReaderObservationContext,
    type ReaderObserver,
} from '@event-driven-platform/observability';
import type { Query } from '@event-driven-platform/query';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';

import { CachedReadExecutor } from '../cache/cached-read-executor.js';
import { DefaultReadTimeout } from '../control/default-read-timeout.js';
import { ReadExecutionControl } from '../control/read-execution-control.js';
import { ReadCancelledError } from '../errors/read-cancelled.error.js';
import { ReadTimedOutError } from '../errors/read-timed-out.error.js';
import { ReadSourceExecutor } from '../source/read-source-executor.js';
import type { DefaultReaderDependencies } from './default-reader-dependencies.js';
import type { Reader } from './reader.js';

export type { DefaultReaderDependencies } from './default-reader-dependencies.js';

export class DefaultReader implements Reader {
    private readonly clock;
    private readonly observer: ReaderObserver;
    private readonly sourceExecutor: ReadSourceExecutor;
    private readonly cachedExecutor: CachedReadExecutor;
    private readonly executionControl: ReadExecutionControl;

    public constructor(dependencies: DefaultReaderDependencies) {
        this.clock = dependencies.clock ?? new SystemClock();
        this.observer = new SafeObserver(
            dependencies.observer ?? new NoopObserver<ReaderObservation>(),
        );
        this.sourceExecutor = new ReadSourceExecutor({
            readHandlerResolver: dependencies.readHandlerResolver,
            clock: this.clock,
            observer: this.observer,
        });
        this.cachedExecutor = new CachedReadExecutor({
            sourceExecutor: this.sourceExecutor,
            readExecutionCoordinator: dependencies.readExecutionCoordinator,
            ownerIdFactory: dependencies.readExecutionOwnerIdFactory ?? randomUUID,
            clock: this.clock,
            observer: this.observer,
        });
        this.executionControl = new ReadExecutionControl(
            dependencies.readTimeout ?? new DefaultReadTimeout(),
        );
    }

    public async execute<TRead extends AnyRead>(query: Query<TRead>): Promise<ReadResultOf<TRead>> {
        const context: ReaderObservationContext = { read: query.read.name };
        const startedAt = this.clock.now();

        this.observer.observe({ type: 'read.requested', context });
        this.observer.observe({ type: 'read.started', context });

        const cachePlan = query.options?.cache;
        const work =
            cachePlan === undefined
                ? () => this.sourceExecutor.execute(query.read, context)
                : () => this.cachedExecutor.execute(query, cachePlan, context);

        try {
            const result = await this.executionControl.execute(work, query.options);

            this.observer.observe({
                type: 'read.completed',
                context,
                outcome: 'success',
                durationMs: this.durationSince(startedAt),
            });

            return result;
        } catch (error: unknown) {
            this.observer.observe({
                type: 'read.completed',
                context,
                outcome:
                    error instanceof ReadTimedOutError
                        ? 'timed-out'
                        : error instanceof ReadCancelledError
                          ? 'cancelled'
                          : 'error',
                durationMs: this.durationSince(startedAt),
            });

            throw error;
        }
    }

    private durationSince(startedAt: string): number {
        return Math.max(0, Date.parse(this.clock.now()) - Date.parse(startedAt));
    }
}

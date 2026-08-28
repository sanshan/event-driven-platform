import type { Clock } from '@event-driven-platform/clock';
import type { ReaderObservationContext, ReaderObserver } from '@event-driven-platform/observability';
import type { AnyRead, ReadResultOf } from '@event-driven-platform/read';
import type { ReadHandlerResolution, ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import { ReadHandlerAmbiguousError } from '../errors/read-handler-ambiguous.error.js';
import { ReadHandlerNotFoundError } from '../errors/read-handler-not-found.error.js';

export interface ReadSourceExecutorDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly clock: Clock;
    readonly observer: ReaderObserver;
}

export class ReadSourceExecutor {
    public constructor(private readonly dependencies: ReadSourceExecutorDependencies) {}

    public async execute<TRead extends AnyRead>(
        read: TRead,
        context: ReaderObservationContext,
    ): Promise<ReadResultOf<TRead>> {
        const startedAt = this.dependencies.clock.now();

        try {
            const resolution = this.dependencies.readHandlerResolver.resolve(read);
            const handler = this.resolveHandler(resolution);
            const result = await handler.execute(read);

            this.dependencies.observer.observe({
                type: 'source.completed',
                context,
                outcome: 'success',
                durationMs: this.durationSince(startedAt),
            });

            return result;
        } catch (error: unknown) {
            this.dependencies.observer.observe({
                type: 'source.completed',
                context,
                outcome: 'error',
                durationMs: this.durationSince(startedAt),
            });

            throw error;
        }
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

    private durationSince(startedAt: string): number {
        return Math.max(
            0,
            Date.parse(this.dependencies.clock.now()) - Date.parse(startedAt),
        );
    }
}

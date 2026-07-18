import type { CommandContext } from '@event-driven-platform/command';
import type { AnyEvent, EventEnvelope } from '@event-driven-platform/event';
import type { AnyOperation } from '@event-driven-platform/operation';

export interface CreateOperationEventEnvelopesRequest<
    TEvent extends AnyEvent,
    TOperation extends AnyOperation,
> {
    readonly operation: TOperation;

    readonly context: CommandContext;

    readonly events: readonly TEvent[];
}

export interface OperationEventEnvelopeFactory {
    createMany<TEvent extends AnyEvent, TOperation extends AnyOperation>(
        request: CreateOperationEventEnvelopesRequest<TEvent, TOperation>,
    ): readonly EventEnvelope<
        TEvent,
        TOperation['name'],
        TOperation['tenant'],
        TOperation['aggregate']
    >[];
}

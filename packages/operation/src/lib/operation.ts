import type {Actor} from '@event-driven-platform/actor';
import type {Intent} from '@event-driven-platform/intent';
import type {Subject} from '@event-driven-platform/subject';
import type {Brand} from '@event-driven-platform/types';

export interface Operation<
    TName extends string,
    TAggregateId extends Brand<string, string>,
    TPayload,
> {
    readonly name: TName;

    readonly intent: Intent;
    readonly correlationId: string;

    readonly actor: Actor;
    readonly subject: Subject;

    readonly aggregateId: TAggregateId;

    readonly payload: TPayload;
}

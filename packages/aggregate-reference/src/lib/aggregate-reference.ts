import type { Brand } from '@event-driven-platform/types';

export interface AggregateReference<TType extends string, TId extends Brand<string, string>> {
    readonly type: TType;

    readonly id: TId;
}

export type AnyAggregateReference = AggregateReference<string, Brand<string, string>>;

export interface AggregateReferenceDescriptor<
    TType extends string,
    TId extends Brand<string, string>,
> {
    readonly type: TType;

    readonly id: TId;
}

export interface AggregateReferenceFactory {
    create<TType extends string, TId extends Brand<string, string>>(
        descriptor: AggregateReferenceDescriptor<TType, TId>,
    ): AggregateReference<TType, TId>;
}

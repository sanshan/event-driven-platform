import type { Brand } from '@event-driven-platform/types';

export interface TenantReference<TType extends string, TId extends Brand<string, string>> {
    readonly type: TType;

    readonly id: TId;
}

export type AnyTenantReference = TenantReference<string, Brand<string, string>>;

export interface TenantReferenceDescriptor<
    TType extends string,
    TId extends Brand<string, string>,
> {
    readonly type: TType;

    readonly id: TId;
}

export interface TenantReferenceFactory {
    create<TType extends string, TId extends Brand<string, string>>(
        descriptor: TenantReferenceDescriptor<TType, TId>,
    ): TenantReference<TType, TId>;
}

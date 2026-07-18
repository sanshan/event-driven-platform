import type { Brand } from '@event-driven-platform/types';

import type {
    TenantReference,
    TenantReferenceDescriptor,
    TenantReferenceFactory,
} from './tenant-reference.js';
import { tenantReferenceDescriptorSchema } from './tenant-reference-descriptor-schema.js';

export class DefaultTenantReferenceFactory implements TenantReferenceFactory {
    create<TType extends string, TId extends Brand<string, string>>(
        descriptor: TenantReferenceDescriptor<TType, TId>,
    ): TenantReference<TType, TId> {
        const parsed = tenantReferenceDescriptorSchema.parse(descriptor);

        return Object.freeze({
            type: parsed.type as TType,
            id: parsed.id as TId,
        });
    }
}

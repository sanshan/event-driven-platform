import type { Brand } from '@event-driven-platform/types';

import {
    type AggregateReference,
    type AggregateReferenceDescriptor,
    type AggregateReferenceFactory,
} from './aggregate-reference.js';
import { aggregateReferenceDescriptorSchema } from './aggregate-reference-descriptor-schema.js';

export class DefaultAggregateReferenceFactory implements AggregateReferenceFactory {
    create<TType extends string, TId extends Brand<string, string>>(
        descriptor: AggregateReferenceDescriptor<TType, TId>,
    ): AggregateReference<TType, TId> {
        const parsed = aggregateReferenceDescriptorSchema.parse(descriptor);

        return Object.freeze({
            type: parsed.type as TType,
            id: parsed.id as TId,
        });
    }
}

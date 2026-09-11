import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { renderEventContractProtobufSchema } from './event-schema-protobuf.js';

describe('renderEventContractProtobufSchema nested ordering', () => {
    it('keeps full schema source stable when nested object declaration order changes', () => {
        const first = defineEventContract({
            name: 'documents.nested-order-a',
            schemaVersion: 1,
            payload: z.object({
                primary: z.object({ value: z.string() }),
                secondary: z.object({ value: z.string() }),
            }),
        });
        const second = defineEventContract({
            name: 'documents.nested-order-b',
            schemaVersion: 1,
            payload: z.object({
                secondary: z.object({ value: z.string() }),
                primary: z.object({ value: z.string() }),
            }),
        });
        const options = {
            messageName: 'NestedOrder',
            fieldNumbers: {
                primary: 1,
                'primary.value': 1,
                secondary: 2,
                'secondary.value': 1,
            },
        } as const;

        expect(renderEventContractProtobufSchema(first, options)).toBe(
            renderEventContractProtobufSchema(second, options),
        );
    });
});

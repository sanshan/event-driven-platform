import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { renderEventContractAvroSchema } from './event-schema-avro.js';

describe('renderEventContractAvroSchema', () => {
    it('renders the supported shallow Avro subset deterministically', () => {
        const contract = defineEventContract({
            name: 'documents.registered',
            schemaVersion: 1,
            payload: z.object({
                documentId: z.string(),
                active: z.boolean(),
                confidence: z.number(),
                attempt: z.int32(),
                tags: z.array(z.string()),
                metadata: z.object({ source: z.string() }),
                state: z.enum(['queued', 'ready']),
                description: z.string().nullable(),
            }),
        });
        const options = { recordName: 'DocumentRegistered', namespace: 'com.accounterbro.documents' } as const;

        const schema = renderEventContractAvroSchema(contract, options);

        expect(renderEventContractAvroSchema(contract, options)).toEqual(schema);
        expect(schema).toEqual({
            type: 'record',
            name: 'DocumentRegistered',
            namespace: 'com.accounterbro.documents',
            fields: [
                { name: 'documentId', type: 'string' },
                { name: 'active', type: 'boolean' },
                { name: 'confidence', type: 'double' },
                { name: 'attempt', type: 'int' },
                { name: 'tags', type: { type: 'array', items: 'string' } },
                {
                    name: 'metadata',
                    type: {
                        type: 'record',
                        name: 'DocumentRegistered_metadata_record',
                        fields: [{ name: 'source', type: 'string' }],
                    },
                },
                {
                    name: 'state',
                    type: {
                        type: 'enum',
                        name: 'DocumentRegistered_state_enum',
                        symbols: ['queued', 'ready'],
                    },
                },
                { name: 'description', type: ['null', 'string'] },
            ],
        });
    });

    it('rejects optional fields', () => {
        const contract = defineEventContract({
            name: 'documents.optional-field',
            schemaVersion: 1,
            payload: z.object({
                documentId: z.string(),
                legacyReference: z.string().optional(),
            }),
        });

        expect(() => renderEventContractAvroSchema(contract, { recordName: 'OptionalField' })).toThrow(
            /payload\.legacyReference.*optional fields are unsupported/i,
        );
    });

    it('rejects invalid Avro enum symbols without renaming them', () => {
        const contract = defineEventContract({
            name: 'documents.invalid-enum',
            schemaVersion: 1,
            payload: z.object({ state: z.enum(['ready', 'not-ready']) }),
        });

        expect(() => renderEventContractAvroSchema(contract, { recordName: 'InvalidEnum' })).toThrow(
            /payload\.state.*not-ready.*valid Avro symbol/i,
        );
    });
});

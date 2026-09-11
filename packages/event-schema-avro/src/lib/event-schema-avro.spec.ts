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

    it('rejects generic integers instead of guessing an Avro width', () => {
        const contract = defineEventContract({
            name: 'documents.generic-integer',
            schemaVersion: 1,
            payload: z.object({ count: z.int() }),
        });

        expect(() => renderEventContractAvroSchema(contract, { recordName: 'GenericInteger' })).toThrow(
            /payload\.count.*generic.*integer.*z\.int32/i,
        );
    });

    it('rejects constrained primitives that would lose validation semantics', () => {
        const contract = defineEventContract({
            name: 'documents.constrained',
            schemaVersion: 1,
            payload: z.object({ documentId: z.string().min(1) }),
        });

        expect(() => renderEventContractAvroSchema(contract, { recordName: 'Constrained' })).toThrow(
            /payload\.documentId.*minLength/i,
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

    it('rejects generated named-type collisions deterministically', () => {
        const contract = defineEventContract({
            name: 'documents.name-collision',
            schemaVersion: 1,
            payload: z.object({
                a_b: z.object({ first: z.string() }),
                a: z.object({ b: z.object({ second: z.string() }) }),
            }),
        });

        expect(() => renderEventContractAvroSchema(contract, { recordName: 'Collision' })).toThrow(
            /payload\.a\.b.*Collision_a_b_record.*collides/i,
        );
    });
});

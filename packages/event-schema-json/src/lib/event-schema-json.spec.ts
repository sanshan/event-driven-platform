import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { renderEventContractJsonSchema } from './event-schema-json.js';

describe('renderEventContractJsonSchema', () => {
    it('renders the supported payload structure deterministically', () => {
        const contract = defineEventContract({
            name: 'documents.registered',
            schemaVersion: 1,
            payload: z.object({
                documentId: z.string(),
                active: z.boolean(),
                confidence: z.number(),
                attempt: z.int32(),
                tags: z.array(z.string()),
                metadata: z.object({
                    source: z.string(),
                    note: z.string().optional(),
                }),
                state: z.enum(['queued', 'ready']),
                description: z.string().nullable(),
                legacyReference: z.string().optional(),
            }),
        });

        const schema = renderEventContractJsonSchema(contract);

        expect(renderEventContractJsonSchema(contract)).toEqual(schema);
        expect(schema).toMatchObject({
            type: 'object',
            properties: {
                documentId: { type: 'string' },
                active: { type: 'boolean' },
                confidence: { type: 'number' },
                attempt: {
                    type: 'integer',
                    minimum: -2147483648,
                    maximum: 2147483647,
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                },
                metadata: {
                    type: 'object',
                    properties: {
                        source: { type: 'string' },
                        note: { type: 'string' },
                    },
                    required: ['source'],
                    additionalProperties: false,
                },
                state: {
                    type: 'string',
                    enum: ['queued', 'ready'],
                },
                description: {
                    type: ['string', 'null'],
                },
                legacyReference: { type: 'string' },
            },
            required: [
                'documentId',
                'active',
                'confidence',
                'attempt',
                'tags',
                'metadata',
                'state',
                'description',
            ],
            additionalProperties: false,
        });
    });

    it('uses the authoritative Zod output side instead of rendering transform input', () => {
        const contract = defineEventContract({
            name: 'documents.payload-length',
            schemaVersion: 1,
            payload: z.string().transform((value) => value.length),
        });

        expect(() => renderEventContractJsonSchema(contract)).toThrow(
            /Cannot render JSON Schema for event "documents\.payload-length".*transform/i,
        );
    });

    it('fails closed for an unrepresentable runtime-only payload construct', () => {
        const contract = defineEventContract({
            name: 'documents.runtime-only',
            schemaVersion: 1,
            payload: z.object({
                createdAt: z.date(),
            }),
        });

        expect(() => renderEventContractJsonSchema(contract)).toThrow(
            /Cannot render JSON Schema for event "documents\.runtime-only".*date/i,
        );
    });
});

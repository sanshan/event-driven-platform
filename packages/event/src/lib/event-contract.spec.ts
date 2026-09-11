import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { EventEnvelope } from './event-envelope.js';
import type { Event } from './event.js';
import {
    defineEventContract,
    type EventEnvelopeOf,
    type EventOf,
    type EventPayloadOf,
} from './event-contract.js';

const documentRegistered = defineEventContract({
    name: 'documents.registered',
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        pageCount: z.string().transform(Number),
    }),
});

type DocumentRegisteredPayload = {
    documentId: string;
    pageCount: number;
};

describe('EventContract', () => {
    it('constructs an identified Event and uses the Zod output as its payload', () => {
        const event = documentRegistered.create({
            documentId: 'document-1',
            pageCount: '3',
        });

        expect(event).toEqual({
            name: 'documents.registered',
            schemaVersion: 1,
            payload: {
                documentId: 'document-1',
                pageCount: 3,
            },
        });

        const existingBoundary: Event<'documents.registered', 1, DocumentRegisteredPayload> = event;

        expect(existingBoundary).toBe(event);
    });

    it('parses an unknown Event using its exact name, version, and payload schema', () => {
        const event = documentRegistered.parse({
            name: 'documents.registered',
            schemaVersion: 1,
            payload: {
                documentId: 'document-1',
                pageCount: '3',
            },
        });

        expect(event.payload.pageCount).toBe(3);

        expect(() =>
            documentRegistered.parse({
                name: 'documents.deleted',
                schemaVersion: 1,
                payload: {
                    documentId: 'document-1',
                    pageCount: '3',
                },
            }),
        ).toThrow();

        expect(() =>
            documentRegistered.parse({
                name: 'documents.registered',
                schemaVersion: 2,
                payload: {
                    documentId: 'document-1',
                    pageCount: '3',
                },
            }),
        ).toThrow();

        expect(() =>
            documentRegistered.parse({
                name: 'documents.registered',
                schemaVersion: 1,
                payload: {
                    documentId: 'document-1',
                    pageCount: 3,
                },
            }),
        ).toThrow();
    });

    it('derives payload, Event, and EventEnvelope types from one contract', () => {
        expectTypeOf<EventPayloadOf<typeof documentRegistered>>().toEqualTypeOf<DocumentRegisteredPayload>();

        expectTypeOf<EventOf<typeof documentRegistered>>().toEqualTypeOf<
            Event<'documents.registered', 1, DocumentRegisteredPayload>
        >();

        expectTypeOf<EventEnvelopeOf<typeof documentRegistered>>().toEqualTypeOf<
            EventEnvelope<Event<'documents.registered', 1, DocumentRegisteredPayload>>
        >();
    });
});

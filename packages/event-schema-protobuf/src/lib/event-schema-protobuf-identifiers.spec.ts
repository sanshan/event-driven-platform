import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { renderEventContractProtobufSchema } from './event-schema-protobuf.js';

describe('renderEventContractProtobufSchema identifiers', () => {
    it('rejects fields whose implicit ProtoJSON names collide', () => {
        const contract = defineEventContract({
            name: 'documents.json-name-collision',
            schemaVersion: 1,
            payload: z.object({
                foo_bar: z.string(),
                fooBar: z.string(),
            }),
        });

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'JsonNameCollision',
                fieldNumbers: { foo_bar: 1, fooBar: 2 },
            }),
        ).toThrow(/payload\.fooBar.*JSON field name "fooBar".*collides.*foo_bar/i);
    });

    it('accepts contextual protobuf keywords when they are valid identifiers', () => {
        const contract = defineEventContract({
            name: 'documents.keyword-field',
            schemaVersion: 1,
            payload: z.object({ package: z.string() }),
        });

        expect(
            renderEventContractProtobufSchema(contract, {
                messageName: 'KeywordField',
                fieldNumbers: { package: 1 },
            }),
        ).toContain('string package = 1;');
    });
});

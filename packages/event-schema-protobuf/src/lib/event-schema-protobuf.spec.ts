import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { renderEventContractProtobufSchema } from './event-schema-protobuf.js';

describe('renderEventContractProtobufSchema', () => {
    it('renders the supported shallow subset with explicit stable field numbers', () => {
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
            }),
        });

        const source = renderEventContractProtobufSchema(contract, {
            messageName: 'DocumentRegistered',
            package: 'accounterbro.documents',
            fieldNumbers: {
                documentId: 1,
                active: 2,
                confidence: 3,
                attempt: 4,
                tags: 5,
                metadata: 6,
                'metadata.source': 1,
                'metadata.note': 2,
            },
        });

        expect(source).toBe(`syntax = "proto3";

package accounterbro.documents;

message DocumentRegistered {
  string documentId = 1;
  bool active = 2;
  double confidence = 3;
  int32 attempt = 4;
  repeated string tags = 5;
  DocumentRegistered_metadata_message metadata = 6;
}

message DocumentRegistered_metadata_message {
  string source = 1;
  optional string note = 2;
}
`);
    });

    it('keeps schema output stable when Zod property declaration order changes', () => {
        const first = defineEventContract({
            name: 'documents.order-a',
            schemaVersion: 1,
            payload: z.object({
                documentId: z.string(),
                active: z.boolean(),
            }),
        });
        const second = defineEventContract({
            name: 'documents.order-b',
            schemaVersion: 1,
            payload: z.object({
                active: z.boolean(),
                documentId: z.string(),
            }),
        });
        const options = {
            messageName: 'DocumentState',
            fieldNumbers: { documentId: 7, active: 2 },
        } as const;

        expect(renderEventContractProtobufSchema(first, options)).toBe(
            renderEventContractProtobufSchema(second, options),
        );
        expect(renderEventContractProtobufSchema(first, options)).toContain('bool active = 2;');
        expect(renderEventContractProtobufSchema(first, options)).toContain('string documentId = 7;');
    });

    it('keeps existing field numbers unchanged when a new numbered field is added', () => {
        const contract = defineEventContract({
            name: 'documents.evolved',
            schemaVersion: 2,
            payload: z.object({
                documentId: z.string(),
                active: z.boolean(),
                source: z.string(),
            }),
        });

        const source = renderEventContractProtobufSchema(contract, {
            messageName: 'DocumentState',
            fieldNumbers: { documentId: 1, active: 2, source: 9 },
        });

        expect(source).toContain('string documentId = 1;');
        expect(source).toContain('bool active = 2;');
        expect(source).toContain('string source = 9;');
    });

    it('rejects missing, duplicate, illegal, and reserved field numbers', () => {
        const contract = defineEventContract({
            name: 'documents.numbering',
            schemaVersion: 1,
            payload: z.object({ first: z.string(), second: z.string() }),
        });

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'Numbering',
                fieldNumbers: { first: 1 },
            }),
        ).toThrow(/payload\.second.*missing explicit Protobuf field number/i);

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'Numbering',
                fieldNumbers: { first: 1, second: 1 },
            }),
        ).toThrow(/payload\.second.*field number 1 duplicates/i);

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'Numbering',
                fieldNumbers: { first: 0, second: 2 },
            }),
        ).toThrow(/payload\.first.*field number 0.*1 to 536870911/i);

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'Numbering',
                fieldNumbers: { first: 19000, second: 2 },
            }),
        ).toThrow(/payload\.first.*reserved range 19000-19999/i);
    });

    it('rejects nullable values and finite business string enums', () => {
        const nullable = defineEventContract({
            name: 'documents.nullable',
            schemaVersion: 1,
            payload: z.object({ description: z.string().nullable() }),
        });
        const enumContract = defineEventContract({
            name: 'documents.state',
            schemaVersion: 1,
            payload: z.object({ state: z.enum(['queued', 'ready']) }),
        });

        expect(() =>
            renderEventContractProtobufSchema(nullable, {
                messageName: 'Nullable',
                fieldNumbers: { description: 1 },
            }),
        ).toThrow(/payload\.description.*nullable values are unsupported/i);

        expect(() =>
            renderEventContractProtobufSchema(enumContract, {
                messageName: 'State',
                fieldNumbers: { state: 1 },
            }),
        ).toThrow(/payload\.state.*string enums are unsupported/i);
    });

    it('rejects optional arrays while allowing singular optional presence', () => {
        const optionalScalar = defineEventContract({
            name: 'documents.optional-scalar',
            schemaVersion: 1,
            payload: z.object({ note: z.string().optional() }),
        });
        const optionalArray = defineEventContract({
            name: 'documents.optional-array',
            schemaVersion: 1,
            payload: z.object({ tags: z.array(z.string()).optional() }),
        });

        expect(
            renderEventContractProtobufSchema(optionalScalar, {
                messageName: 'OptionalScalar',
                fieldNumbers: { note: 1 },
            }),
        ).toContain('optional string note = 1;');

        expect(() =>
            renderEventContractProtobufSchema(optionalArray, {
                messageName: 'OptionalArray',
                fieldNumbers: { tags: 1 },
            }),
        ).toThrow(/payload\.tags.*optional arrays are unsupported/i);
    });

    it('rejects generic integers and constrained primitives', () => {
        const genericInteger = defineEventContract({
            name: 'documents.generic-integer',
            schemaVersion: 1,
            payload: z.object({ count: z.int() }),
        });
        const constrained = defineEventContract({
            name: 'documents.constrained',
            schemaVersion: 1,
            payload: z.object({ documentId: z.string().min(1) }),
        });

        expect(() =>
            renderEventContractProtobufSchema(genericInteger, {
                messageName: 'GenericInteger',
                fieldNumbers: { count: 1 },
            }),
        ).toThrow(/payload\.count.*generic.*integer.*z\.int32/i);

        expect(() =>
            renderEventContractProtobufSchema(constrained, {
                messageName: 'Constrained',
                fieldNumbers: { documentId: 1 },
            }),
        ).toThrow(/payload\.documentId.*minLength/i);
    });

    it('rejects invalid names and generated message-name collisions without renaming', () => {
        const simple = defineEventContract({
            name: 'documents.invalid-name',
            schemaVersion: 1,
            payload: z.object({ documentId: z.string() }),
        });

        expect(() =>
            renderEventContractProtobufSchema(simple, {
                messageName: 'document-registered',
                fieldNumbers: { documentId: 1 },
            }),
        ).toThrow(/root message name.*not a valid Protobuf identifier/i);

        expect(() =>
            renderEventContractProtobufSchema(simple, {
                messageName: 'DocumentRegistered',
                package: 'documents.invalid-package',
                fieldNumbers: { documentId: 1 },
            }),
        ).toThrow(/package.*not a valid Protobuf package name/i);

        const collision = defineEventContract({
            name: 'documents.name-collision',
            schemaVersion: 1,
            payload: z.object({
                a_b: z.object({ first: z.string() }),
                a: z.object({ b: z.object({ second: z.string() }) }),
            }),
        });

        expect(() =>
            renderEventContractProtobufSchema(collision, {
                messageName: 'Collision',
                fieldNumbers: {
                    a_b: 1,
                    'a_b.first': 1,
                    a: 2,
                    'a.b': 1,
                    'a.b.second': 1,
                },
            }),
        ).toThrow(/payload\.a\.b.*Collision_a_b_message.*collides/i);
    });

    it('fails closed when Zod cannot represent the runtime payload schema', () => {
        const contract = defineEventContract({
            name: 'documents.runtime-only',
            schemaVersion: 1,
            payload: z.object({ sequence: z.bigint() }),
        });

        expect(() =>
            renderEventContractProtobufSchema(contract, {
                messageName: 'RuntimeOnly',
                fieldNumbers: { sequence: 1 },
            }),
        ).toThrow(/Cannot render Protobuf schema.*bigint/i);
    });
});

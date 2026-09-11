export interface AvroField {
    readonly name: string;
    readonly type: AvroSchema;
}

export interface AvroRecordSchema {
    readonly type: 'record';
    readonly name: string;
    readonly namespace?: string;
    readonly fields: readonly AvroField[];
}

export interface AvroEnumSchema {
    readonly type: 'enum';
    readonly name: string;
    readonly symbols: readonly string[];
}

export interface AvroArraySchema {
    readonly type: 'array';
    readonly items: AvroSchema;
}

export type AvroNonNullSchema =
    | 'string'
    | 'boolean'
    | 'double'
    | 'int'
    | AvroRecordSchema
    | AvroEnumSchema
    | AvroArraySchema;

export type AvroSchema = AvroNonNullSchema | readonly ['null', AvroNonNullSchema];

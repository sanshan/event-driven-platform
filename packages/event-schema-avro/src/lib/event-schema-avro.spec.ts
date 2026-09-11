import { eventSchemaAvro } from './event-schema-avro.js';

describe('eventSchemaAvro', () => {
    it('should work', () => {
        expect(eventSchemaAvro()).toEqual('event-schema-avro');
    });
});

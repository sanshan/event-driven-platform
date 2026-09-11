import { eventSchemaProtobuf } from './event-schema-protobuf.js';

describe('eventSchemaProtobuf', () => {
    it('should work', () => {
        expect(eventSchemaProtobuf()).toEqual('event-schema-protobuf');
    });
});

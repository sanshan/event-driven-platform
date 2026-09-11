import { eventSchemaJson } from './event-schema-json.js';

describe('eventSchemaJson', () => {
    it('should work', () => {
        expect(eventSchemaJson()).toEqual('event-schema-json');
    });
});

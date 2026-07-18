import { v5 as uuidV5 } from 'uuid';

import { buildEventIdKey } from './build-event-id-key.js';
import { eventIdDescriptorSchema } from './event-id-descriptor-schema.js';
import { EVENT_ID_UUID_NAMESPACE } from './event-id-namespace.js';
import type { EventId, EventIdDescriptor, EventIdFactory } from './event-id.js';

export class DefaultEventIdFactory implements EventIdFactory {
    create(descriptor: EventIdDescriptor): EventId {
        const parsed = eventIdDescriptorSchema.parse(descriptor);

        const key = buildEventIdKey(parsed);

        return uuidV5(key, EVENT_ID_UUID_NAMESPACE) as EventId;
    }
}

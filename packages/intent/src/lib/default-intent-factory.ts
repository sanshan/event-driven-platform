import { v5 as uuidV5 } from 'uuid';

import { buildIntentKey } from './build-intent-key.js';
import { intentDescriptorSchema } from './intent-descriptor-schema.js';
import { INTENT_UUID_NAMESPACE } from './intent-namespace.js';
import type { Intent, IntentDescriptor, IntentFactory } from './intent.js';

export class DefaultIntentFactory implements IntentFactory {
    create(descriptor: IntentDescriptor): Intent {
        const parsed = intentDescriptorSchema.parse(descriptor);

        const key = buildIntentKey(parsed);
        const id = uuidV5(key, INTENT_UUID_NAMESPACE);

        return Object.freeze({
            id,
            key,
        });
    }
}

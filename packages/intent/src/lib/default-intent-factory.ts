import { v5 as uuidV5 } from 'uuid';

import { buildIntentKey } from './build-intent-key.js';
import { intentDerivationRequestSchema } from './intent-derivation-schema.js';
import { intentDescriptorSchema } from './intent-descriptor-schema.js';
import { INTENT_UUID_NAMESPACE } from './intent-namespace.js';
import type { Intent, IntentDerivationRequest, IntentDescriptor, IntentFactory } from './intent.js';

export class DefaultIntentFactory implements IntentFactory {
    create(descriptor: IntentDescriptor): Intent {
        const parsed = intentDescriptorSchema.parse(descriptor);

        const validatedDescriptor: IntentDescriptor = {
            namespace: parsed.namespace,
            action: parsed.action,
            version: parsed.version,
            tenant: descriptor.tenant,
            components: parsed.components,
        };

        const key = buildIntentKey(validatedDescriptor);

        const id = uuidV5(key, INTENT_UUID_NAMESPACE);

        return Object.freeze({
            id,
            key,
        });
    }

    derive(request: IntentDerivationRequest): Intent {
        const parsed = intentDerivationRequestSchema.parse(request);

        const validatedRequest: IntentDerivationRequest = {
            parent: Object.freeze({
                id: parsed.parent.id,
            }),
            slot: parsed.slot,
            ...(parsed.discriminator === undefined
                ? {}
                : {
                      discriminator: parsed.discriminator,
                  }),
        };

        const key = buildIntentKey(validatedRequest);
        const id = uuidV5(key, INTENT_UUID_NAMESPACE);
        const derivation = Object.freeze({
            slot: validatedRequest.slot,
            ...(validatedRequest.discriminator === undefined
                ? {}
                : {
                      discriminator: validatedRequest.discriminator,
                  }),
        });

        return Object.freeze({
            id,
            key,
            parent: validatedRequest.parent,
            derivation,
        });
    }
}

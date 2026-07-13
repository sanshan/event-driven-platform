import type { Actor, ActorDescriptor, ActorFactory } from './actor.js';
import { actorDescriptorSchema } from './actor-descriptor-schema.js';

export class DefaultActorFactory implements ActorFactory {
    create(descriptor: ActorDescriptor): Actor {
        const parsed = actorDescriptorSchema.parse(descriptor);

        return Object.freeze({
            ...parsed,
            origin: Object.freeze(parsed.origin),
        });
    }
}

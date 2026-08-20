import type { CommandOptions } from '@event-driven-platform/command';
import type { AnyOperation } from '@event-driven-platform/operation';

type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

function encode(value: string | number): string {
    return encodeURIComponent(String(value));
}

export function buildRateLimitBucketKey(
    rateLimit: ConfiguredRateLimit,
    operation: AnyOperation,
): string {
    const prefix = encode(rateLimit.key);

    switch (rateLimit.scope) {
        case 'global':
            return `${prefix}|global`;

        case 'actor':
            return `${prefix}|actor|${encode(operation.actor.type)}|${encode(operation.actor.id)}`;

        case 'tenant':
            return `${prefix}|tenant|${encode(operation.tenant.type)}|${encode(operation.tenant.id)}`;

        case 'subject':
            return `${prefix}|subject|${encode(operation.subject.type)}|${encode(operation.subject.id)}`;

        case 'operation':
            return `${prefix}|operation|${encode(operation.name)}|${encode(operation.schemaVersion)}`;
    }
}

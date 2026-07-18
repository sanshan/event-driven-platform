import type { IntentDescriptor } from './intent.js';

function encode(value: string): string {
    return encodeURIComponent(value);
}

export function buildIntentKey(descriptor: IntentDescriptor): string {
    const tenant = [
        `tenantType=${encode(descriptor.tenant.type)}`,
        `tenantId=${encode(descriptor.tenant.id)}`,
    ].join('&');

    const components = Object.entries(descriptor.components)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${encode(name)}=${encode(value)}`)
        .join('&');

    return [
        descriptor.namespace,
        descriptor.action,
        `v${descriptor.version}`,
        tenant,
        components,
    ].join(':');
}

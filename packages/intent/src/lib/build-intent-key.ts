import type { IntentDerivationRequest, IntentDescriptor } from './intent.js';

function encode(value: string): string {
    return encodeURIComponent(value);
}

function buildRootIntentKey(descriptor: IntentDescriptor): string {
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

function buildDerivedIntentKey(request: IntentDerivationRequest): string {
    const segments = [
        '@derived',
        'v1',
        `parentIntentId=${encode(request.parent.id)}`,
        `slot=${encode(request.slot)}`,
    ];

    if (request.discriminator !== undefined) {
        segments.push(`discriminator=${encode(request.discriminator)}`);
    }

    return segments.join(':');
}

export function buildIntentKey(descriptor: IntentDescriptor): string;
export function buildIntentKey(descriptor: IntentDerivationRequest): string;
export function buildIntentKey(descriptor: IntentDescriptor | IntentDerivationRequest): string {
    if ('parent' in descriptor) {
        return buildDerivedIntentKey(descriptor);
    }

    return buildRootIntentKey(descriptor);
}

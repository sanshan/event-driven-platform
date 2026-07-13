import type {IntentDescriptor} from './intent.js';

export function buildIntentKey(
    descriptor: IntentDescriptor,
): string {
    const components = Object.entries(descriptor.components)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
            ([name, value]) =>
                `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        )
        .join('&');

    return [
        descriptor.namespace,
        descriptor.action,
        `v${descriptor.version}`,
        components,
    ].join(':');
}
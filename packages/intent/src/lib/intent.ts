import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

import type { IntentDerivation } from './intent-derivation.js';
import type { IntentParentReference } from './intent-parent-reference.js';

export interface Intent {
    readonly id: string;

    readonly key: string;

    readonly parent?: IntentParentReference;

    readonly derivation?: IntentDerivation;
}

export interface IntentDescriptor {
    readonly namespace: string;

    readonly action: string;

    readonly version: number;

    readonly tenant: AnyTenantReference;

    readonly components: Readonly<Record<string, string>>;
}

export interface IntentFactory {
    create(descriptor: IntentDescriptor): Intent;

    derive(request: IntentDerivationRequest): Intent;
}

export interface IntentDerivationRequest extends IntentDerivation {
    readonly parent: IntentParentReference;
}

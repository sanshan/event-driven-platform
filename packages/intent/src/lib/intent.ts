export interface Intent {
    readonly id: string;
    readonly key: string;
}

export interface IntentDescriptor {
    readonly namespace: string;
    readonly action: string;
    readonly version: number;
    readonly components: Readonly<Record<string, string>>;
}

export interface IntentFactory {
    create(descriptor: IntentDescriptor): Intent;
}

export type ActorType =
    | 'user'
    | 'service'
    | 'system'
    | 'scheduler';

export interface ActorOrigin {
    readonly ipAddress?: string;

    readonly countryCode?: string;
    readonly region?: string;
    readonly city?: string;

    readonly latitude?: number;
    readonly longitude?: number;
    readonly timezone?: string;

    readonly environment?: string;
    readonly host?: string;
    readonly instance?: string;
}

export interface Actor {
    readonly type: ActorType;
    readonly id: string;
    readonly origin: ActorOrigin;
}

export interface ActorDescriptor {
    readonly type: ActorType;
    readonly id: string;
    readonly origin?: ActorOrigin;
}

export interface ActorFactory {
    create(descriptor: ActorDescriptor): Actor;
}
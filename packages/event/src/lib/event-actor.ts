export interface EventActorOrigin {
    readonly ipAddress: string | null;

    readonly countryCode: string | null;

    readonly region: string | null;

    readonly city: string | null;

    readonly latitude: number | null;

    readonly longitude: number | null;

    readonly timezone: string | null;

    readonly environment: string | null;

    readonly host: string | null;

    readonly instance: string | null;
}

export interface EventActor {
    readonly type: string;

    readonly id: string;

    readonly origin: EventActorOrigin;
}

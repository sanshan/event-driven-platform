export interface ProtobufRenderOptions {
    readonly messageName: string;
    readonly package?: string;
    readonly fieldNumbers: Readonly<Record<string, number>>;
}

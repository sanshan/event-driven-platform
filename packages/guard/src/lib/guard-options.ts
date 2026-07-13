export interface GuardOptions {
    /**
     * Stable name used by Runner to resolve
     * the corresponding guard implementation.
     */
    readonly name: string;

    /**
     * Serializable guard-specific configuration.
     */
    readonly params?: Readonly<Record<string, unknown>>;

    /**
     * Rejection metadata used by Runner
     * when guard evaluation fails.
     */
    readonly rejectWith?: GuardRejection;
}

export interface GuardRejection {
    readonly reason: string;

    readonly code?: string;
}

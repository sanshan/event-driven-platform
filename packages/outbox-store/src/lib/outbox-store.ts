import type { AnyOutboxRecord } from '@event-driven-platform/outbox';

/**
 * Infrastructure port for persisting Outbox records.
 *
 * append() participates in the transaction active in the
 * surrounding execution scope.
 *
 * The store persists records only. It does not publish them.
 */
export interface OutboxStore {
    append(records: readonly AnyOutboxRecord[]): Promise<void>;
}

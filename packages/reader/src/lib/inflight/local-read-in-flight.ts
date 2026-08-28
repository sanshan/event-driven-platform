import type { ReadCacheKey } from '@event-driven-platform/query';

export class LocalReadInFlight {
    private readonly flights = new Map<string, Promise<unknown>>();

    run<TResult>(
        key: ReadCacheKey,
        execute: () => Promise<TResult>,
        onJoined: () => void = () => undefined,
    ): Promise<TResult> {
        const identity = this.identityOf(key);
        const active = this.flights.get(identity);

        if (active !== undefined) {
            onJoined();
            return active as Promise<TResult>;
        }

        const flight = execute().finally(() => {
            if (this.flights.get(identity) === flight) {
                this.flights.delete(identity);
            }
        });

        this.flights.set(identity, flight);

        return flight;
    }

    private identityOf(key: ReadCacheKey): string {
        return JSON.stringify([key.namespace, key.version, key.partition, key.value]);
    }
}

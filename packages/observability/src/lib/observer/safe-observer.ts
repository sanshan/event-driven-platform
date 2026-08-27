import type { Observer } from './observer.js';

export class SafeObserver<TObservation> implements Observer<TObservation> {
    public constructor(private readonly delegate: Observer<TObservation>) {}

    public observe(observation: TObservation): undefined {
        try {
            this.delegate.observe(observation);
        } catch {
            // Observability must never affect the observed execution pipeline.
        }

        return undefined;
    }
}

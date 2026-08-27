import type { Observer } from './observer.js';

export class NoopObserver<TObservation> implements Observer<TObservation> {
    public observe(observation: TObservation): void {
        void observation;
    }
}

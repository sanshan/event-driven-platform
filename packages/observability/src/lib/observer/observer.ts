export interface Observer<TObservation> {
    observe(observation: TObservation): undefined;
}

import type { Observer } from '../observer/observer.js';
import type { UseCaseExecutorObservation } from './use-case-executor-observation.js';

export type UseCaseExecutorObserver = Observer<UseCaseExecutorObservation>;

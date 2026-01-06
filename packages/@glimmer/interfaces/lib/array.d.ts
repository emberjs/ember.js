import type { Optional } from './core.js';

export type PresentArray<T> = [T, ...T[]];
export type OptionalArray<T> = Optional<PresentArray<T>>;

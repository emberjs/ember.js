import { _WeakSet } from '@ember/polyfills';

const EMBER_ARRAYS = new _WeakSet();

export interface EmberArray<T> {
  length: number;
  hasArrayObservers?: boolean;
  objectAt(index: number): T | undefined;
  replace(start: number, deleteCount: number, items: T[]): void;
  splice(start: number, deleteCount: number, ...items: T[]): void;
}

export function setEmberArray(obj: object) {
  EMBER_ARRAYS.add(obj);
}

export function isEmberArray(obj: unknown): obj is EmberArray<unknown> {
  return EMBER_ARRAYS.has(obj as object);
}

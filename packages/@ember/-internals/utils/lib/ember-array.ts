import symbol from './symbol';

export const EMBER_ARRAY = symbol('EMBER_ARRAY');

export interface EmberArray<T> {
  length: number;
  hasArrayObservers?: boolean;
  objectAt(index: number): T | undefined;
  replace(start: number, deleteCount: number, items: T[]): void;
  splice(start: number, deleteCount: number, ...items: T[]): void;
}

export function isEmberArray(obj: any): obj is EmberArray<unknown> {
  return obj && obj[EMBER_ARRAY];
}

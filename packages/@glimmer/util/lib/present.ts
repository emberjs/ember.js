import { type Option, type Present, type PresentArray } from '@glimmer/interfaces';

export function isPresent<T>(value: T): value is Present<T> {
  return value !== null && value !== undefined;
}

export function assertPresent<T extends string>(value: T): asserts value is Present<T>;
export function assertPresent<T>(value: T, message: string): asserts value is Present<T>;
export function assertPresent<T>(value: T, message?: string): asserts value is Present<T> {
  if (!isPresent(value)) {
    throw new Error(`Expected present, got ${typeof value === 'string' ? value : message!}`);
  }
}

export function isPresentArray<T>(list: readonly T[]): list is PresentArray<T> {
  return list.length > 0;
}

export function ifPresent<T, U, V>(
  list: T[],
  ifPresent: (input: PresentArray<T>) => U,
  otherwise: () => V
): U | V {
  if (isPresentArray(list)) {
    return ifPresent(list);
  } else {
    return otherwise();
  }
}

export function arrayToOption<T>(list: T[]): Option<PresentArray<T>> {
  if (isPresentArray(list)) {
    return list;
  } else {
    return null;
  }
}

export function assertPresentArray<T>(
  list: T[],
  message = `unexpected empty list`
): asserts list is PresentArray<T> {
  if (!isPresentArray(list)) {
    throw new Error(message);
  }
}

export function asPresentArray<T>(list: T[], message = `unexpected empty list`): PresentArray<T> {
  assertPresentArray(list, message);
  return list;
}

export function getLast<T>(list: PresentArray<T>): T;
export function getLast<T>(list: T[]): T | undefined;
export function getLast<T>(list: T[]): T | undefined {
  return list.length === 0 ? undefined : (list[list.length - 1] as T);
}

export function getFirst<T>(list: PresentArray<T>): T;
export function getFirst<T>(list: T[]): T | undefined;
export function getFirst<T>(list: T[]): T | undefined {
  return list.length === 0 ? undefined : (list[0] as T);
}

export function mapPresentArray<T, U>(
  list: PresentArray<T>,
  mapper: (input: T) => U
): PresentArray<U>;
export function mapPresentArray<T, U>(
  list: PresentArray<T> | null,
  mapper: (input: T) => U
): PresentArray<U> | null;
export function mapPresentArray<T, U>(
  list: PresentArray<T> | null,
  mapper: (input: T) => U
): PresentArray<U> | null {
  if (list === null) {
    return null;
  }
  let out: U[] = [];

  for (let item of list) {
    out.push(mapper(item));
  }

  return out as PresentArray<U>;
}

import { Option, PresentArray } from '@glimmer/interfaces';

export function isPresent<T>(list: readonly T[]): list is PresentArray<T> {
  return list.length > 0;
}

export function ifPresent<T, U, V>(
  list: T[],
  ifPresent: (input: PresentArray<T>) => U,
  otherwise: () => V
): U | V {
  if (isPresent(list)) {
    return ifPresent(list);
  } else {
    return otherwise();
  }
}

export function toPresentOption<T>(list: T[]): Option<PresentArray<T>> {
  if (isPresent(list)) {
    return list;
  } else {
    return null;
  }
}

export function assertPresent<T>(
  list: T[],
  message = `unexpected empty list`
): asserts list is PresentArray<T> {
  if (!isPresent(list)) {
    throw new Error(message);
  }
}

export function mapPresent<T, U>(list: PresentArray<T>, callback: (input: T) => U): PresentArray<U>;
export function mapPresent<T, U>(
  list: PresentArray<T> | null,
  callback: (input: T) => U
): PresentArray<U> | null;
export function mapPresent<T, U>(
  list: PresentArray<T> | null,
  callback: (input: T) => U
): PresentArray<U> | null {
  if (list === null) {
    return null;
  }
  let out: U[] = [];

  for (let item of list) {
    out.push(callback(item));
  }

  return out as PresentArray<U>;
}

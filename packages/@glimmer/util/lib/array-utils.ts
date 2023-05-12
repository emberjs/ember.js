export const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]) as readonly unknown[];

export function emptyArray<T>(): T[] {
  return EMPTY_ARRAY as T[];
}

export const EMPTY_STRING_ARRAY = emptyArray<string>();
export const EMPTY_NUMBER_ARRAY = emptyArray<number>();

/**
 * This function returns `true` if the input array is the special empty array sentinel,
 * which is sometimes used for optimizations.
 */
export function isEmptyArray(input: unknown[] | readonly unknown[]): boolean {
  return input === EMPTY_ARRAY;
}

export function* reverse<T>(input: T[]): IterableIterator<T> {
  for (let i = input.length - 1; i >= 0; i--) {
    yield input[i]!;
  }
}

export function* enumerate<T>(input: Iterable<T>): IterableIterator<[number, T]> {
  let i = 0;
  for (const item of input) {
    yield [i++, item];
  }
}

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

type ZipEntry<T extends readonly unknown[]> = {
  [P in keyof T]: P extends `${infer N extends number}` ? [N, T[P], T[P]] : never;
}[keyof T & number];

/**
 * Zip two tuples with the same type and number of elements.
 */
export function* zipTuples<T extends readonly unknown[]>(
  left: T,
  right: T
): IterableIterator<ZipEntry<T>> {
  for (let i = 0; i < left.length; i++) {
    yield [i, left[i], right[i]] as ZipEntry<T>;
  }
}

export function* zipArrays<T>(
  left: T[],
  right: T[]
): IterableIterator<
  ['retain', number, T, T] | ['pop', number, T, undefined] | ['push', number, undefined, T]
> {
  for (let i = 0; i < left.length; i++) {
    const perform = i < right.length ? 'retain' : 'pop';
    yield [perform, i, left[i], right[i]] as
      | ['retain', number, T, T]
      | ['pop', number, T, undefined];
  }

  for (let i = left.length; i < right.length; i++) {
    yield ['push', i, undefined, right[i]] as ['push', number, undefined, T];
  }
}

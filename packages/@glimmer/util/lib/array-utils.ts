export const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]) as readonly unknown[];

export function emptyArray<T extends unknown>(): readonly T[] {
  return EMPTY_ARRAY as readonly T[];
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

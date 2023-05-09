export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyKey = keyof any;
export type Indexable = Record<AnyKey, unknown>;

// eslint-disable-next-line @typescript-eslint/ban-types
export function indexable<T extends object>(input: T): T & Indexable {
  return input as T & Indexable;
}

export function getGlobal(): Indexable {
  // eslint-disable-next-line n/no-unsupported-features/es-builtins
  if (typeof globalThis !== 'undefined') return indexable(globalThis);
  if (typeof self !== 'undefined') return indexable(self);
  if (typeof window !== 'undefined') return indexable(window);
  if (typeof global !== 'undefined') return indexable(global);

  throw new Error('unable to locate global object');
}

export function unwrap<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val as T;
}

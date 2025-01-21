export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKey = keyof any;
export type Indexable = Record<AnyKey, unknown>;

export function unwrap<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val as T;
}

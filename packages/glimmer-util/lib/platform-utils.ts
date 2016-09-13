export type Opaque = {} | void;
export type Option<T> = T | null; // tslint:disable-line
export type Maybe<T> = Option<T> | undefined; // tslint:disable-line

export function unwrap<T>(val: Maybe<T>): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val;
}

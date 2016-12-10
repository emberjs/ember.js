export type Opaque = {} | void | null | undefined;
export type Option<T> = T | null; // tslint:disable-line
export type Maybe<T> = Option<T> | undefined; // tslint:disable-line

export function unwrap<T>(val: Maybe<T>): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val;
}

export function expect<T>(val: Maybe<T>, message: string): T {
  if (val === null || val === undefined) throw new Error(message);
  return val;
}

export function unreachable(): Error {
  return new Error('unreachable');
}

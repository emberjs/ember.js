export type Opaque = {} | void | null | undefined;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | undefined | void;

export function unwrap<T>(val: Maybe<T>): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val as T;
}

export function expect<T>(val: Maybe<T>, message: string): T {
  if (val === null || val === undefined) throw new Error(message);
  return val as T;
}

export function unreachable(message = "unreachable"): Error {
  return new Error(message);
}

export function typePos(lastOperand: number): number {
  return lastOperand - 4;
}

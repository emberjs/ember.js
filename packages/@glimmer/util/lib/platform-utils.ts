import type { Maybe, Present } from '@glimmer/interfaces';

export type Factory<T> = new (...args: unknown[]) => T;

export function keys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

export function unwrap<T>(val: Maybe<T>): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val as T;
}

export function expect<T>(val: T, message: string): Present<T> {
  if (val === null || val === undefined) throw new Error(message);
  return val as Present<T>;
}

export function unreachable(message = 'unreachable'): Error {
  return new Error(message);
}

export function exhausted(value: never): never {
  throw new Error(`Exhausted ${String(value)}`);
}

export type Lit = string | number | boolean | undefined | null | void | {};

export const tuple = <T extends Lit[]>(...args: T) => args;
